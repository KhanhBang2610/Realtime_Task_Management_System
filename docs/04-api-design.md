# Phần 4: Thiết Kế API (GraphQL - AppSync)

## 4.1 Tổng Quan GraphQL Schema

### Tại sao GraphQL thay vì REST?

```
REST API:
  GET  /api/boards/123          → Lấy board info
  GET  /api/boards/123/tasks    → Lấy tasks (request thứ 2!)
  GET  /api/users/456           → Lấy user info (request thứ 3!)
  = 3 requests, có thể over-fetching data không cần

GraphQL API:
  query {
    getBoard(boardId: "123") {
      name
      tasks { title, assigneeName }  ← Chỉ lấy fields cần thiết
    }
  }
  = 1 request duy nhất, chỉ lấy data cần!
```

## 4.2 Schema Definition (schema.graphql)

```graphql
# ============================================================
# TYPES - Định nghĩa cấu trúc dữ liệu
# ============================================================

type User {
  userId: ID!
  email: String!
  displayName: String!
  avatarUrl: String
  boardIds: [String]
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type Board {
  boardId: ID!
  name: String!
  description: String
  ownerId: String!
  ownerName: String!
  columns: [Column!]!
  members: [BoardMember!]!
  backgroundColor: String
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
  # Resolved field - lấy tasks từ Tasks table
  tasks: [Task]
}

type Column {
  id: ID!
  name: String!
  position: Int!
}

type BoardMember {
  userId: String!
  displayName: String!
  avatarUrl: String
  role: MemberRole!
  joinedAt: AWSDateTime!
}

type Task {
  taskId: ID!
  boardId: String!
  title: String!
  description: String
  columnId: String!
  position: Int!
  assigneeId: String
  assigneeName: String
  createdBy: String!
  priority: Priority!
  dueDate: AWSDateTime
  labels: [String]
  attachments: [Attachment]
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type Attachment {
  fileName: String!
  url: String!
  uploadedAt: AWSDateTime!
}

type ActivityLog {
  logId: ID!
  boardId: String!
  action: String!
  userId: String!
  userName: String!
  targetType: String!
  targetId: String!
  details: AWSJSON
  timestamp: AWSDateTime!
}

# ============================================================
# ENUMS
# ============================================================

enum MemberRole {
  OWNER
  ADMIN
  MEMBER
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

# ============================================================
# INPUT TYPES - Dữ liệu đầu vào cho mutations
# ============================================================

input CreateBoardInput {
  name: String!
  description: String
  backgroundColor: String
  columns: [ColumnInput]
}

input ColumnInput {
  id: String!
  name: String!
  position: Int!
}

input UpdateBoardInput {
  boardId: ID!
  name: String
  description: String
  backgroundColor: String
  columns: [ColumnInput]
}

input CreateTaskInput {
  boardId: ID!
  title: String!
  description: String
  columnId: String!
  position: Int!
  assigneeId: String
  priority: Priority
  dueDate: AWSDateTime
  labels: [String]
}

input UpdateTaskInput {
  boardId: ID!
  taskId: ID!
  title: String
  description: String
  assigneeId: String
  priority: Priority
  dueDate: AWSDateTime
  labels: [String]
}

input MoveTaskInput {
  boardId: ID!
  taskId: ID!
  newColumnId: String!
  newPosition: Int!
}

input InviteMemberInput {
  boardId: ID!
  email: String!
  role: MemberRole!
}

# ============================================================
# QUERIES - Đọc dữ liệu
# ============================================================

type Query {
  # User queries
  getMyProfile: User!
  getUserById(userId: ID!): User

  # Board queries
  getBoard(boardId: ID!): Board
  listMyBoards: [Board!]!

  # Task queries
  getTask(boardId: ID!, taskId: ID!): Task
  listTasksByBoard(boardId: ID!): [Task!]!
  listMyAssignedTasks: [Task!]!

  # Activity queries
  listActivityLogs(boardId: ID!, limit: Int): [ActivityLog!]!
}

# ============================================================
# MUTATIONS - Ghi/cập nhật dữ liệu
# ============================================================

type Mutation {
  # User mutations
  createUserProfile(displayName: String!, avatarUrl: String): User!
  updateUserProfile(displayName: String, avatarUrl: String): User!

  # Board mutations
  createBoard(input: CreateBoardInput!): Board!
  updateBoard(input: UpdateBoardInput!): Board!
  deleteBoard(boardId: ID!): Board!
  inviteMember(input: InviteMemberInput!): Board!
  removeMember(boardId: ID!, userId: ID!): Board!

  # Task mutations
  createTask(input: CreateTaskInput!): Task!
  updateTask(input: UpdateTaskInput!): Task!
  moveTask(input: MoveTaskInput!): Task!
  deleteTask(boardId: ID!, taskId: ID!): Task!
}

# ============================================================
# SUBSCRIPTIONS - Nhận cập nhật realtime
# ============================================================

type Subscription {
  # Subscribe theo boardId - nhận TẤT CẢ thay đổi trên board
  onTaskCreated(boardId: ID!): Task
    @aws_subscribe(mutations: ["createTask"])

  onTaskUpdated(boardId: ID!): Task
    @aws_subscribe(mutations: ["updateTask", "moveTask"])

  onTaskDeleted(boardId: ID!): Task
    @aws_subscribe(mutations: ["deleteTask"])

  onBoardUpdated(boardId: ID!): Board
    @aws_subscribe(mutations: ["updateBoard", "inviteMember", "removeMember"])
}
```

## 4.3 Chi Tiết Queries

### Query 1: getMyProfile
```graphql
# Frontend gọi khi user đăng nhập
query GetMyProfile {
  getMyProfile {
    userId
    email
    displayName
    avatarUrl
    boardIds
  }
}

# AppSync resolver: Dùng Cognito identity để lấy userId
# → DynamoDB GetItem: Users table, PK = $ctx.identity.sub
```

### Query 2: getBoard (với nested tasks)
```graphql
# Frontend gọi khi mở 1 board
query GetBoard($boardId: ID!) {
  getBoard(boardId: $boardId) {
    boardId
    name
    description
    columns {
      id
      name
      position
    }
    members {
      userId
      displayName
      avatarUrl
      role
    }
    tasks {
      taskId
      title
      description
      columnId
      position
      assigneeName
      priority
      dueDate
      labels
    }
  }
}

# AppSync resolver:
# 1. getBoard: DynamoDB GetItem → Boards table, PK = boardId
# 2. tasks (nested): DynamoDB Query → Tasks table, PK = boardId
# → 2 DynamoDB operations, nhưng chỉ 1 GraphQL request!
```

### Query 3: listMyBoards
```graphql
# Frontend gọi ở Dashboard
query ListMyBoards {
  listMyBoards {
    boardId
    name
    description
    backgroundColor
    members {
      displayName
      avatarUrl
    }
    updatedAt
  }
}

# AppSync resolver (Lambda):
# 1. Lấy user profile → Users table → boardIds
# 2. BatchGetItem → Boards table → Lấy all boards
```

### Query 4: listMyAssignedTasks
```graphql
# Frontend: "My Tasks" page
query ListMyAssignedTasks {
  listMyAssignedTasks {
    taskId
    boardId
    title
    columnId
    priority
    dueDate
    updatedAt
  }
}

# AppSync resolver:
# → DynamoDB Query: Tasks table, GSI AssigneeIndex
# PK = current userId, sorted by updatedAt
```

## 4.4 Chi Tiết Mutations

### Mutation 1: createTask
```graphql
mutation CreateTask($input: CreateTaskInput!) {
  createTask(input: $input) {
    taskId
    boardId
    title
    description
    columnId
    position
    assigneeName
    priority
    createdAt
  }
}

# Variables:
{
  "input": {
    "boardId": "board-001",
    "title": "Design homepage mockup",
    "description": "Thiết kế mockup cho trang chủ",
    "columnId": "col-1",
    "position": 0,
    "assigneeId": "cognito-sub-def456",
    "priority": "HIGH",
    "dueDate": "2026-05-10T23:59:59Z",
    "labels": ["design", "frontend"]
  }
}
```

**Lambda resolver logic cho createTask:**
```javascript
// Lambda: createTask handler
exports.handler = async (event) => {
  const { identity, arguments: { input } } = event;
  const userId = identity.sub; // Cognito user ID

  // 1. Validate: User có phải member của board?
  const board = await dynamodb.getItem({
    TableName: 'Boards',
    Key: { boardId: input.boardId }
  });

  const isMember = board.members.some(m => m.userId === userId);
  if (!isMember) {
    throw new Error('Unauthorized: You are not a member of this board');
  }

  // 2. Tạo task ID
  const taskId = `task-${uuidv4()}`;
  const now = new Date().toISOString();

  // 3. Lấy assignee name (denormalize)
  let assigneeName = null;
  if (input.assigneeId) {
    const assignee = await dynamodb.getItem({
      TableName: 'Users',
      Key: { userId: input.assigneeId }
    });
    assigneeName = assignee.displayName;
  }

  // 4. Ghi task vào DynamoDB
  const task = {
    boardId: input.boardId,
    taskId: taskId,
    title: input.title,
    description: input.description || '',
    columnId: input.columnId,
    position: input.position,
    assigneeId: input.assigneeId || null,
    assigneeName: assigneeName,
    createdBy: userId,
    priority: input.priority || 'MEDIUM',
    dueDate: input.dueDate || null,
    labels: input.labels || [],
    attachments: [],
    createdAt: now,
    updatedAt: now
  };

  await dynamodb.putItem({
    TableName: 'Tasks',
    Item: task
  });

  // 5. Ghi Activity Log
  await dynamodb.putItem({
    TableName: 'ActivityLogs',
    Item: {
      boardId: input.boardId,
      timestamp: now,
      logId: `log-${uuidv4()}`,
      action: 'TASK_CREATED',
      userId: userId,
      userName: identity.claims.name,
      targetType: 'TASK',
      targetId: taskId,
      details: { title: input.title, column: input.columnId },
      ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 // 30 ngày
    }
  });

  // 6. Return task → AppSync sẽ broadcast qua Subscription
  return task;
};
```

### Mutation 2: moveTask (QUAN TRỌNG - Kéo thả)
```graphql
mutation MoveTask($input: MoveTaskInput!) {
  moveTask(input: $input) {
    taskId
    boardId
    columnId
    position
    updatedAt
  }
}

# Variables:
{
  "input": {
    "boardId": "board-001",
    "taskId": "task-abc-123",
    "newColumnId": "col-2",
    "newPosition": 0
  }
}
```

**Lambda resolver logic cho moveTask:**
```javascript
exports.handler = async (event) => {
  const { identity, arguments: { input } } = event;
  const userId = identity.sub;
  const now = new Date().toISOString();

  // 1. Validate permission
  const board = await getBoard(input.boardId);
  if (!isMember(board, userId)) {
    throw new Error('Unauthorized');
  }

  // 2. Lấy task hiện tại
  const currentTask = await dynamodb.getItem({
    TableName: 'Tasks',
    Key: { boardId: input.boardId, taskId: input.taskId }
  });

  const oldColumnId = currentTask.columnId;
  const oldPosition = currentTask.position;

  // 3. Update task position
  await dynamodb.updateItem({
    TableName: 'Tasks',
    Key: { boardId: input.boardId, taskId: input.taskId },
    UpdateExpression: 'SET columnId = :col, #pos = :pos, updatedAt = :now',
    ExpressionAttributeNames: { '#pos': 'position' },
    ExpressionAttributeValues: {
      ':col': input.newColumnId,
      ':pos': input.newPosition,
      ':now': now
    }
  });

  // 4. Re-order positions trong old column và new column
  await reorderTaskPositions(input.boardId, oldColumnId);
  if (oldColumnId !== input.newColumnId) {
    await reorderTaskPositions(input.boardId, input.newColumnId);
  }

  // 5. Ghi Activity Log
  await writeActivityLog(input.boardId, {
    action: 'TASK_MOVED',
    userId,
    targetId: input.taskId,
    details: {
      taskTitle: currentTask.title,
      fromColumn: oldColumnId,
      toColumn: input.newColumnId
    }
  });

  // 6. Return → AppSync broadcast qua onTaskUpdated subscription
  return {
    ...currentTask,
    columnId: input.newColumnId,
    position: input.newPosition,
    updatedAt: now
  };
};
```

### Mutation 3: inviteMember
```graphql
mutation InviteMember($input: InviteMemberInput!) {
  inviteMember(input: $input) {
    boardId
    members {
      userId
      displayName
      role
    }
  }
}

# Variables:
{
  "input": {
    "boardId": "board-001",
    "email": "newmember@university.edu",
    "role": "MEMBER"
  }
}
```

## 4.5 Chi Tiết Subscriptions (Realtime)

### Cách hoạt động Subscription

```
┌─────────────────────────────────────────────────────────────┐
│                  SUBSCRIPTION FLOW                           │
│                                                              │
│  1. User mở board → Frontend subscribe:                     │
│     subscription OnTaskUpdated($boardId: ID!) {             │
│       onTaskUpdated(boardId: $boardId) {                    │
│         taskId, columnId, position, updatedAt               │
│       }                                                      │
│     }                                                        │
│                                                              │
│  2. AppSync mở WebSocket connection                         │
│     (persistent connection, giữ mở suốt phiên)             │
│                                                              │
│  3. Khi có mutation (createTask, moveTask, updateTask):     │
│     → AppSync TỰ ĐỘNG broadcast data đến                   │
│        TẤT CẢ subscribers có cùng boardId                   │
│                                                              │
│  4. Frontend nhận data → Cập nhật UI                        │
└─────────────────────────────────────────────────────────────┘
```

### Frontend code subscribe:

```javascript
import { API, graphqlOperation } from 'aws-amplify';

// Subscribe khi component mount
useEffect(() => {
  const subscription = API.graphql(
    graphqlOperation(onTaskUpdated, { boardId: currentBoardId })
  ).subscribe({
    next: ({ value }) => {
      const updatedTask = value.data.onTaskUpdated;
      console.log('Task updated realtime:', updatedTask);

      // Cập nhật state local
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.taskId === updatedTask.taskId ? updatedTask : task
        )
      );
    },
    error: (error) => {
      console.error('Subscription error:', error);
    }
  });

  // Unsubscribe khi component unmount
  return () => subscription.unsubscribe();
}, [currentBoardId]);
```

### Subscribe nhiều events cùng lúc:

```javascript
// Khi mở board, subscribe TẤT CẢ events
const subscribeToBoard = (boardId) => {
  // 1. Subscribe task created
  const subCreated = API.graphql(
    graphqlOperation(onTaskCreated, { boardId })
  ).subscribe({
    next: ({ value }) => {
      const newTask = value.data.onTaskCreated;
      setTasks(prev => [...prev, newTask]);
      showToast(`New task: ${newTask.title}`);
    }
  });

  // 2. Subscribe task updated/moved
  const subUpdated = API.graphql(
    graphqlOperation(onTaskUpdated, { boardId })
  ).subscribe({
    next: ({ value }) => {
      const updated = value.data.onTaskUpdated;
      setTasks(prev =>
        prev.map(t => t.taskId === updated.taskId ? updated : t)
      );
    }
  });

  // 3. Subscribe task deleted
  const subDeleted = API.graphql(
    graphqlOperation(onTaskDeleted, { boardId })
  ).subscribe({
    next: ({ value }) => {
      const deleted = value.data.onTaskDeleted;
      setTasks(prev => prev.filter(t => t.taskId !== deleted.taskId));
    }
  });

  // Return cleanup function
  return () => {
    subCreated.unsubscribe();
    subUpdated.unsubscribe();
    subDeleted.unsubscribe();
  };
};
```

## 4.6 AppSync Resolver Mapping

### Overview resolver types

```
┌──────────────────────────────────────────────────────────────┐
│              RESOLVER MAPPING                                 │
├──────────────────────────────────────────────────────────────┤
│ Operation              │ Resolver Type  │ Data Source        │
├────────────────────────┼────────────────┼────────────────────┤
│ getMyProfile           │ Direct         │ DynamoDB - Users   │
│ getUserById            │ Direct         │ DynamoDB - Users   │
│ getBoard               │ Direct         │ DynamoDB - Boards  │
│ getTask                │ Direct         │ DynamoDB - Tasks   │
│ listTasksByBoard       │ Direct         │ DynamoDB - Tasks   │
│ Board.tasks (nested)   │ Direct         │ DynamoDB - Tasks   │
│ listActivityLogs       │ Direct         │ DynamoDB - ActLogs │
├────────────────────────┼────────────────┼────────────────────┤
│ listMyBoards           │ Lambda         │ boardManager       │
│ listMyAssignedTasks    │ Lambda         │ taskProcessor      │
│ createBoard            │ Lambda         │ boardManager       │
│ updateBoard            │ Lambda         │ boardManager       │
│ deleteBoard            │ Lambda         │ boardManager       │
│ inviteMember           │ Lambda         │ boardManager       │
│ removeMember           │ Lambda         │ boardManager       │
│ createTask             │ Lambda         │ taskProcessor      │
│ updateTask             │ Lambda         │ taskProcessor      │
│ moveTask               │ Lambda         │ taskProcessor      │
│ deleteTask             │ Lambda         │ taskProcessor      │
│ createUserProfile      │ Lambda         │ userManager        │
│ updateUserProfile      │ Lambda         │ userManager        │
└──────────────────────────────────────────────────────────────┘
```

### Ví dụ Direct DynamoDB Resolver (VTL)

```velocity
## Request Mapping Template: getBoard
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": {
    "boardId": $util.dynamodb.toDynamoDBJson($ctx.args.boardId)
  }
}

## Response Mapping Template
#if($ctx.error)
  $util.error($ctx.error.message, $ctx.error.type)
#end

## Kiểm tra authorization: user phải là member
#set($userId = $ctx.identity.sub)
#set($isMember = false)
#foreach($member in $ctx.result.members)
  #if($member.userId == $userId)
    #set($isMember = true)
  #end
#end

#if(!$isMember)
  $util.unauthorized()
#end

$util.toJson($ctx.result)
```

### Ví dụ Nested Resolver (Board.tasks)

```velocity
## Request Mapping Template: Board.tasks
{
  "version": "2018-05-29",
  "operation": "Query",
  "query": {
    "expression": "boardId = :boardId",
    "expressionValues": {
      ":boardId": $util.dynamodb.toDynamoDBJson($ctx.source.boardId)
    }
  }
}

## Response Mapping Template
$util.toJson($ctx.result.items)
```

> [!NOTE]
> **$ctx.source** chứa data của parent object (Board).
> Khi frontend query `board { tasks { ... } }`, AppSync:
> 1. Chạy getBoard resolver → Lấy board data
> 2. Chạy Board.tasks resolver → Query tasks bằng board.boardId
> 3. Merge kết quả trả về frontend
