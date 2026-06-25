# Phần 5: Event-Driven Architecture - Chi Tiết

## 5.1 Xác Định Các Events

### Event Catalog

```
╔══════════════════════════════════════════════════════════════════════╗
║                        EVENT CATALOG                                ║
╠══════════════════════════════════════════════════════════════════════╣
║ Event Name          │ Trigger                │ Consumers            ║
╠═════════════════════╪════════════════════════╪══════════════════════╣
║ TaskCreated         │ User tạo task mới      │ Subscription, SNS   ║
║ TaskUpdated         │ User sửa task          │ Subscription, SNS   ║
║ TaskMoved           │ User kéo thả task      │ Subscription, SNS   ║
║ TaskDeleted         │ User xóa task          │ Subscription, SNS   ║
║ TaskAssigned        │ Task được assign       │ SNS (email)         ║
║ BoardCreated        │ User tạo board mới     │ -                   ║
║ BoardUpdated        │ Board bị sửa           │ Subscription        ║
║ MemberInvited       │ User được mời vào board│ SNS (email)         ║
║ MemberRemoved       │ User bị xóa khỏi board│ SNS                 ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Cấu trúc Event

```json
// Event Schema chung
{
  "eventId": "evt-uuid-v4",          // ID duy nhất của event
  "eventType": "TASK_MOVED",         // Loại event
  "timestamp": "2026-05-05T10:00:00Z", // Thời điểm xảy ra
  "source": "appsync",               // Service tạo ra event
  "userId": "cognito-sub-abc123",    // Người gây ra event
  "boardId": "board-001",            // Board liên quan
  "data": {                          // Chi tiết event
    "taskId": "task-abc-123",
    "changes": {
      "columnId": {
        "old": "col-1",
        "new": "col-2"
      },
      "position": {
        "old": 2,
        "new": 0
      }
    }
  }
}
```

## 5.2 Event Flow Chi Tiết

### Flow tổng quan

```
                    SYNCHRONOUS PATH (Realtime)
                    ═══════════════════════════
                    
User Action → AppSync → Lambda → DynamoDB → AppSync Subscription → Other Users
                                    │
                                    │
                    ASYNCHRONOUS PATH (Background)
                    ════════════════════════════════
                                    │
                                    ▼
                            DynamoDB Streams
                                    │
                                    ▼
                          Lambda (Stream Processor)
                                    │
                           ┌────────┼────────┐
                           ▼        ▼        ▼
                        SNS      CloudWatch  ActivityLog
                         │       (Metrics)   (đã ghi trong
                         │                    sync path)
                    ┌────┼────┐
                    ▼    ▼    ▼
                  Email Push  SMS
```

### Flow 1: TaskCreated

```
STEP 1: User tạo task
══════════════════════
User A click "Add Task" trên board "Sprint 1"
Nhập: title = "Code login page", column = "To Do"

STEP 2: Frontend gửi mutation
══════════════════════════════
mutation {
  createTask(input: {
    boardId: "board-001"
    title: "Code login page"
    columnId: "col-1"
    position: 0
    priority: HIGH
    assigneeId: "user-B"
  }) { taskId, title, columnId }
}

STEP 3: AppSync → Lambda (SYNC)
═════════════════════════════════
Lambda function "taskProcessor":
  ├── Validate: User A là member của board-001? ✅
  ├── Generate taskId: "task-new-456"
  ├── DynamoDB PutItem: Tasks table
  ├── DynamoDB PutItem: ActivityLogs table
  └── Return task data

STEP 4: AppSync Subscription broadcast (SYNC)
═══════════════════════════════════════════════
AppSync detect mutation "createTask" đã complete
→ Broadcast đến tất cả subscribers của onTaskCreated(boardId: "board-001")
→ User B, C (đang mở board) nhận được task mới

     User B's browser                    User C's browser
     ┌────────────────┐                 ┌────────────────┐
     │ Board: Sprint 1│                 │ Board: Sprint 1│
     │                │                 │                │
     │ TO DO          │                 │ TO DO          │
     │ ┌────────────┐ │                 │ ┌────────────┐ │
     │ │🆕 Code     │ │  ← Xuất hiện   │ │🆕 Code     │ │
     │ │login page  │ │   realtime!    │ │login page  │ │
     │ └────────────┘ │                 │ └────────────┘ │
     └────────────────┘                 └────────────────┘

STEP 5: DynamoDB Stream → Lambda (ASYNC)
═════════════════════════════════════════
DynamoDB Streams capture INSERT event
→ Trigger Lambda "streamProcessor"
→ Lambda đọc event:
  {
    "eventName": "INSERT",
    "dynamodb": {
      "NewImage": {
        "boardId": "board-001",
        "taskId": "task-new-456",
        "title": "Code login page",
        "assigneeId": "user-B"
      }
    }
  }

STEP 6: Lambda → SNS (ASYNC)
═════════════════════════════
Lambda "streamProcessor":
  ├── Xác định: Task được assign cho User B
  ├── Lấy email User B từ Users table
  └── Publish message lên SNS topic "task-notifications"

SNS message:
{
  "topicArn": "arn:aws:sns:ap-southeast-1:123456:task-notifications",
  "message": {
    "type": "TASK_ASSIGNED",
    "recipient": "userB@university.edu",
    "title": "Bạn được giao task mới",
    "body": "User A đã giao task 'Code login page' cho bạn trong board 'Sprint 1'"
  }
}

STEP 7: SNS → Email (ASYNC)
════════════════════════════
SNS gửi email đến User B:
  To: userB@university.edu
  Subject: [Task Manager] Bạn được giao task mới
  Body: User A đã giao task "Code login page" cho bạn...
```

### Flow 2: TaskMoved (Kéo thả - Quan trọng nhất)

```
STEP 1: User kéo task
═══════════════════════
User A kéo "Code login page" từ "To Do" → "In Progress"

     TRƯỚC                              SAU
     ┌──────────┐ ┌──────────┐         ┌──────────┐ ┌──────────┐
     │  TO DO   │ │IN PROGRESS│        │  TO DO   │ │IN PROGRESS│
     ├──────────┤ ├──────────┤         ├──────────┤ ├──────────┤
     │▓▓▓▓▓▓▓▓▓│ │          │  ──►   │          │ │▓▓▓▓▓▓▓▓▓│
     │▓Code   ▓│ │          │         │          │ │▓Code   ▓│
     │▓login  ▓│ │          │         │          │ │▓login  ▓│
     │▓▓▓▓▓▓▓▓▓│ │          │         │          │ │▓▓▓▓▓▓▓▓▓│
     └──────────┘ └──────────┘         └──────────┘ └──────────┘

STEP 2: Optimistic Update (Frontend)
═════════════════════════════════════
Trước khi gửi request đến server, UI đã cập nhật NGAY
→ User A thấy task di chuyển mượt mà, không lag

STEP 3: Frontend gửi mutation
══════════════════════════════
mutation {
  moveTask(input: {
    boardId: "board-001"
    taskId: "task-new-456"
    newColumnId: "col-2"      ← "In Progress"
    newPosition: 0
  }) { taskId, columnId, position, updatedAt }
}

STEP 4: AppSync → Lambda (SYNC)
═════════════════════════════════
Lambda "taskProcessor":
  ├── Validate: User A có quyền? ✅
  ├── Đọc task hiện tại: columnId = "col-1", position = 0
  ├── Update DynamoDB: SET columnId = "col-2", position = 0
  ├── Re-order tasks trong col-1 (giảm position)
  ├── Re-order tasks trong col-2 (tăng position cho tasks khác)
  ├── Ghi ActivityLog
  └── Return updated task

STEP 5: Subscription broadcast (SYNC)
═══════════════════════════════════════
AppSync broadcast onTaskUpdated → User B, C thấy task di chuyển

STEP 6: DynamoDB Stream (ASYNC)
════════════════════════════════
Stream capture MODIFY event:
{
  "eventName": "MODIFY",
  "dynamodb": {
    "OldImage": { "columnId": "col-1", "position": 0 },
    "NewImage": { "columnId": "col-2", "position": 0 }
  }
}

Lambda "streamProcessor" phân tích:
  ├── columnId thay đổi? → YES → Event type = TASK_MOVED
  ├── Lấy tên column cũ và mới
  └── Publish SNS notification

STEP 7: SNS → Notifications
════════════════════════════
Email đến board members:
  "User A đã chuyển task 'Code login page' từ 'To Do' sang 'In Progress'"
```

### Flow 3: TaskUpdated

```
STEP 1: User sửa task
═══════════════════════
User A mở task "Code login page"
Sửa: priority = URGENT, dueDate = "2026-05-07"

STEP 2-4: Tương tự TaskMoved (SYNC path)
STEP 5: DynamoDB Stream (ASYNC)
════════════════════════════════
Stream capture MODIFY:
  OldImage: { priority: "HIGH", dueDate: null }
  NewImage: { priority: "URGENT", dueDate: "2026-05-07" }

Lambda phân tích:
  ├── priority thay đổi? → YES (HIGH → URGENT)
  ├── dueDate thay đổi? → YES (null → 2026-05-07)
  ├── columnId thay đổi? → NO → Event type = TASK_UPDATED (not MOVED)
  └── Publish SNS: "Task 'Code login page' priority changed to URGENT"
```

## 5.3 Stream Processor Lambda - Code Chi Tiết

```javascript
// Lambda: streamProcessor
// Trigger: DynamoDB Streams (Tasks table)

const AWS = require('aws-sdk');
const sns = new AWS.SNS();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

exports.handler = async (event) => {
  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error('Error processing record:', error);
      // Không throw → Tránh retry toàn bộ batch
    }
  }
};

async function processRecord(record) {
  const eventName = record.eventName; // INSERT, MODIFY, REMOVE
  const newImage = record.dynamodb.NewImage
    ? AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage)
    : null;
  const oldImage = record.dynamodb.OldImage
    ? AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage)
    : null;

  switch (eventName) {
    case 'INSERT':
      await handleTaskCreated(newImage);
      break;
    case 'MODIFY':
      await handleTaskModified(oldImage, newImage);
      break;
    case 'REMOVE':
      await handleTaskDeleted(oldImage);
      break;
  }
}

async function handleTaskCreated(task) {
  // Gửi notification cho assignee (nếu có)
  if (task.assigneeId) {
    await sendNotification({
      type: 'TASK_ASSIGNED',
      boardId: task.boardId,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      message: `Bạn được giao task mới: "${task.title}"`
    });
  }

  // Gửi notification cho tất cả board members
  await notifyBoardMembers(task.boardId, {
    type: 'TASK_CREATED',
    message: `Task mới "${task.title}" đã được tạo`,
    excludeUserId: task.createdBy // Không notify người tạo
  });
}

async function handleTaskModified(oldTask, newTask) {
  // Detect loại thay đổi
  if (oldTask.columnId !== newTask.columnId) {
    // TASK_MOVED
    await notifyBoardMembers(newTask.boardId, {
      type: 'TASK_MOVED',
      message: `Task "${newTask.title}" đã chuyển từ "${oldTask.columnId}" sang "${newTask.columnId}"`,
      excludeUserId: getLastModifiedBy(newTask)
    });
  } else if (oldTask.assigneeId !== newTask.assigneeId) {
    // TASK_REASSIGNED
    if (newTask.assigneeId) {
      await sendNotification({
        type: 'TASK_ASSIGNED',
        boardId: newTask.boardId,
        assigneeId: newTask.assigneeId,
        message: `Bạn được giao task: "${newTask.title}"`
      });
    }
  } else {
    // TASK_UPDATED (other changes)
    await notifyBoardMembers(newTask.boardId, {
      type: 'TASK_UPDATED',
      message: `Task "${newTask.title}" đã được cập nhật`
    });
  }
}

async function handleTaskDeleted(task) {
  await notifyBoardMembers(task.boardId, {
    type: 'TASK_DELETED',
    message: `Task "${task.title}" đã bị xóa`
  });
}

async function notifyBoardMembers(boardId, notification) {
  // Lấy board để biết members
  const board = await dynamodb.get({
    TableName: 'Boards',
    Key: { boardId }
  }).promise();

  const members = board.Item.members || [];

  for (const member of members) {
    if (member.userId !== notification.excludeUserId) {
      await sendNotification({
        ...notification,
        recipientId: member.userId,
        boardId
      });
    }
  }
}

async function sendNotification(notification) {
  await sns.publish({
    TopicArn: SNS_TOPIC_ARN,
    Message: JSON.stringify(notification),
    MessageAttributes: {
      'notificationType': {
        DataType: 'String',
        StringValue: notification.type
      },
      'boardId': {
        DataType: 'String',
        StringValue: notification.boardId
      }
    }
  }).promise();
}
```

## 5.4 Cách Decouple System

### Trước (Coupled)
```
┌─────────────────────────────────────────┐
│           COUPLED SYSTEM                 │
│                                          │
│  moveTask() {                           │
│    updateDB();          ← DB operation  │
│    sendEmail();         ← Email service │
│    updateCache();       ← Cache service │
│    writeLog();          ← Log service   │
│    sendPushNotif();     ← Push service  │
│    updateAnalytics();   ← Analytics     │
│  }                                      │
│                                          │
│  ❌ Nếu sendEmail() fail → toàn bộ fail│
│  ❌ Response time = SUM of all ops      │
│  ❌ Muốn thêm feature → sửa moveTask() │
│  ❌ Khó test từng phần riêng lẻ         │
└─────────────────────────────────────────┘
```

### Sau (Decoupled với Events)
```
┌─────────────────────────────────────────────────────────┐
│           DECOUPLED SYSTEM (Event-Driven)                │
│                                                          │
│  moveTask() {               ← Chỉ làm 1 việc          │
│    updateDB();              ← Ghi DB xong → return     │
│  }                          ← Response time = DB only!  │
│                                                          │
│  DynamoDB Stream emits event ──────────────────────┐    │
│                                                     │    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │    │
│  │Email     │  │Cache     │  │Analytics │   ← Subscribe │
│  │Processor │  │Updater   │  │Logger    │     to events │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                          │
│  ✅ sendEmail fail → DB vẫn ok, user vẫn thấy update   │
│  ✅ Response time = chỉ DB operation (< 10ms)           │
│  ✅ Muốn thêm feature → Thêm subscriber mới            │
│  ✅ Test dễ: test từng processor riêng lẻ               │
└─────────────────────────────────────────────────────────┘
```

### Ví dụ mở rộng: Thêm tính năng mới

```
Yêu cầu mới: "Ghi audit log vào S3 cho compliance"

COUPLED:
  → Phải sửa hàm moveTask()
  → Phải sửa createTask()
  → Phải sửa deleteTask()
  → ... sửa TẤT CẢ functions
  → Risk: break existing code

EVENT-DRIVEN:
  → Tạo 1 Lambda mới "auditLogger"
  → Subscribe vào DynamoDB Stream (hoặc SNS)
  → Ghi event ra S3
  → KHÔNG SỬA bất kỳ code cũ nào!
  → Zero risk cho existing features
```

> [!IMPORTANT]
> **Event-driven = "Tell, don't ask"**
> - moveTask() không cần biết ai sẽ xử lý event
> - Nó chỉ cần update DB → Event tự phát ra
> - Ai quan tâm thì subscribe → Loose coupling
