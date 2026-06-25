# Phần 6: Notification System + Phần 7: Frontend Design

---

# 6. Notification System (Amazon SNS)

## 6.1 Kiến Trúc Notification

```
┌───────────────────────────────────────────────────────────────┐
│                   NOTIFICATION ARCHITECTURE                    │
│                                                                │
│  DynamoDB Streams                                             │
│       │                                                        │
│       ▼                                                        │
│  Lambda (streamProcessor)                                     │
│       │                                                        │
│       ▼                                                        │
│  ┌────────────────────────────┐                               │
│  │     Amazon SNS             │                               │
│  │                            │                               │
│  │  Topic: task-notifications │                               │
│  │       │                    │                               │
│  │       ├── Email Protocol   │──► ses → user@email.com       │
│  │       │                    │                               │
│  │       ├── Lambda Protocol  │──► Lambda → In-app notif      │
│  │       │   (inAppNotifier)  │       │                       │
│  │       │                    │       ▼                       │
│  │       │                    │   DynamoDB                    │
│  │       │                    │   (Notifications table)      │
│  │       │                    │                               │
│  │       └── HTTP/S Protocol  │──► Webhook (future: Slack)   │
│  │            (optional)      │                               │
│  └────────────────────────────┘                               │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

## 6.2 SNS Topic Configuration

### Tạo SNS Topic

```javascript
// AWS CDK hoặc CloudFormation
const taskNotificationTopic = new sns.Topic(this, 'TaskNotifications', {
  topicName: 'task-notifications',
  displayName: 'Task Management Notifications'
});

// Subscription 1: Lambda cho in-app notifications
taskNotificationTopic.addSubscription(
  new subs.LambdaSubscription(inAppNotifierLambda)
);

// Subscription 2: Email (cho từng user - dynamic)
// → Sẽ subscribe khi user đăng ký nhận email notifications
```

### Filter Policy (Lọc notification)

```json
// User có thể chọn chỉ nhận notification cho specific events
{
  "FilterPolicy": {
    "notificationType": ["TASK_ASSIGNED", "TASK_MOVED"],
    "boardId": ["board-001", "board-002"]
  }
}
// → User chỉ nhận notification cho TASK_ASSIGNED và TASK_MOVED
// → Chỉ từ board-001 và board-002
```

## 6.3 In-App Notification Lambda

```javascript
// Lambda: inAppNotifier
// Trigger: SNS subscription

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message);

    // Lưu notification vào DynamoDB
    const notification = {
      recipientId: message.recipientId,        // PK
      timestamp: new Date().toISOString(),      // SK
      notificationId: `notif-${Date.now()}`,
      type: message.type,
      boardId: message.boardId,
      message: message.message,
      isRead: false,
      ttl: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 // 7 ngày
    };

    await dynamodb.put({
      TableName: 'Notifications',
      Item: notification
    }).promise();
  }
};
```

### Notifications Table (DynamoDB)

```
Table: Notifications
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Attribute      │ Type   │ Key          │ Mô tả  │
├────────────────┼────────┼──────────────┼─────────┤
│ recipientId    │ String │ Partition Key│ userId  │
│ timestamp      │ String │ Sort Key     │ Time    │
│ notificationId │ String │              │ UUID    │
│ type           │ String │              │ Event   │
│ boardId        │ String │              │ Board   │
│ message        │ String │              │ Text    │
│ isRead         │ Boolean│              │ Status  │
│ ttl            │ Number │              │ Expire  │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 6.4 Mở Rộng: Email Notification

```javascript
// Sử dụng Amazon SES để gửi email đẹp
const AWS = require('aws-sdk');
const ses = new AWS.SES();

async function sendEmailNotification(recipient, notification) {
  const params = {
    Destination: {
      ToAddresses: [recipient.email]
    },
    Message: {
      Subject: {
        Data: `[Task Manager] ${notification.message}`
      },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial; padding: 20px; max-width: 600px;">
              <h2 style="color: #1e40af;">Task Manager</h2>
              <div style="background: #f0f9ff; padding: 16px; border-radius: 8px;">
                <p style="margin: 0; font-size: 16px;">
                  ${notification.message}
                </p>
              </div>
              <p style="margin-top: 16px;">
                <a href="https://your-app.com/board/${notification.boardId}"
                   style="background: #3b82f6; color: white; padding: 10px 20px;
                          text-decoration: none; border-radius: 6px;">
                  Xem Board
                </a>
              </p>
              <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
                Bạn nhận email này vì bạn là thành viên của board.
              </p>
            </div>
          `
        }
      }
    },
    Source: 'noreply@your-app.com'
  };

  await ses.sendEmail(params).promise();
}
```

> [!TIP]
> **Amazon SES Free Tier**: 62,000 emails/tháng miễn phí (nếu gửi từ EC2/Lambda).
> Đủ dùng cho project sinh viên!

---

# 7. Thiết Kế Frontend (React)

## 7.1 Cấu Trúc Project

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── index.js                    # Entry point
│   ├── App.js                      # Root component + routing
│   ├── aws-exports.js              # AWS Amplify config (auto-generated)
│   │
│   ├── graphql/                    # GraphQL operations
│   │   ├── queries.js              # Tất cả queries
│   │   ├── mutations.js            # Tất cả mutations
│   │   └── subscriptions.js        # Tất cả subscriptions
│   │
│   ├── components/                 # Reusable components
│   │   ├── Layout/
│   │   │   ├── Header.jsx          # Top navigation bar
│   │   │   ├── Sidebar.jsx         # Sidebar navigation
│   │   │   └── Layout.jsx          # Main layout wrapper
│   │   │
│   │   ├── Auth/
│   │   │   ├── LoginForm.jsx       # Login form
│   │   │   ├── SignUpForm.jsx      # Sign up form
│   │   │   └── AuthProvider.jsx    # Auth context provider
│   │   │
│   │   ├── Board/
│   │   │   ├── BoardCard.jsx       # Board preview card
│   │   │   ├── BoardList.jsx       # Grid of board cards
│   │   │   ├── BoardView.jsx       # Full board view (columns + tasks)
│   │   │   ├── Column.jsx          # Single column (To Do, In Progress...)
│   │   │   └── CreateBoardModal.jsx# Modal tạo board mới
│   │   │
│   │   ├── Task/
│   │   │   ├── TaskCard.jsx        # Task card (draggable)
│   │   │   ├── TaskDetail.jsx      # Task detail modal
│   │   │   ├── CreateTaskForm.jsx  # Form tạo task
│   │   │   └── TaskLabel.jsx       # Label badge
│   │   │
│   │   ├── DragDrop/
│   │   │   └── DragDropContext.jsx # Drag & drop wrapper
│   │   │
│   │   └── Notification/
│   │       ├── NotificationBell.jsx    # Bell icon + badge
│   │       └── NotificationList.jsx    # Dropdown list
│   │
│   ├── hooks/                      # Custom hooks
│   │   ├── useAuth.js              # Authentication hook
│   │   ├── useBoard.js             # Board data + subscriptions
│   │   ├── useTasks.js             # Tasks data + subscriptions
│   │   └── useNotifications.js     # Notifications
│   │
│   ├── pages/                      # Page components
│   │   ├── DashboardPage.jsx       # Dashboard - list boards
│   │   ├── BoardPage.jsx           # Single board view
│   │   ├── LoginPage.jsx           # Login page
│   │   └── ProfilePage.jsx         # User profile
│   │
│   ├── contexts/                   # React contexts
│   │   ├── AuthContext.js
│   │   └── BoardContext.js
│   │
│   └── utils/                      # Utility functions
│       ├── amplifyConfig.js        # Amplify setup
│       └── helpers.js              # Helper functions
│
├── package.json
└── .env
```

## 7.2 Các Component Chính

### Component: BoardView (Board chính)

```jsx
// components/Board/BoardView.jsx
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { API, graphqlOperation } from 'aws-amplify';
import Column from './Column';
import { listTasksByBoard } from '../../graphql/queries';
import { moveTask } from '../../graphql/mutations';
import { onTaskCreated, onTaskUpdated, onTaskDeleted } from '../../graphql/subscriptions';

const BoardView = ({ board }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch tasks khi mount
  useEffect(() => {
    fetchTasks();
  }, [board.boardId]);

  // 2. Subscribe realtime updates
  useEffect(() => {
    const subscriptions = subscribeToBoard(board.boardId);
    return () => subscriptions.forEach(sub => sub.unsubscribe());
  }, [board.boardId]);

  const fetchTasks = async () => {
    try {
      const result = await API.graphql(
        graphqlOperation(listTasksByBoard, { boardId: board.boardId })
      );
      setTasks(result.data.listTasksByBoard);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const subscribeToBoard = (boardId) => {
    const subs = [];

    // Subscribe: Task created
    subs.push(
      API.graphql(graphqlOperation(onTaskCreated, { boardId }))
        .subscribe({
          next: ({ value }) => {
            const newTask = value.data.onTaskCreated;
            setTasks(prev => [...prev, newTask]);
          }
        })
    );

    // Subscribe: Task updated/moved
    subs.push(
      API.graphql(graphqlOperation(onTaskUpdated, { boardId }))
        .subscribe({
          next: ({ value }) => {
            const updated = value.data.onTaskUpdated;
            setTasks(prev =>
              prev.map(t => t.taskId === updated.taskId ? updated : t)
            );
          }
        })
    );

    // Subscribe: Task deleted
    subs.push(
      API.graphql(graphqlOperation(onTaskDeleted, { boardId }))
        .subscribe({
          next: ({ value }) => {
            const deleted = value.data.onTaskDeleted;
            setTasks(prev => prev.filter(t => t.taskId !== deleted.taskId));
          }
        })
    );

    return subs;
  };

  // 3. Handle drag & drop
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Dropped outside any column
    if (!destination) return;

    // Same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    // Optimistic update: UI cập nhật NGAY
    const updatedTasks = [...tasks];
    const taskIndex = updatedTasks.findIndex(t => t.taskId === draggableId);
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      columnId: destination.droppableId,
      position: destination.index
    };
    setTasks(updatedTasks);

    // Gửi mutation đến server
    try {
      await API.graphql(
        graphqlOperation(moveTask, {
          input: {
            boardId: board.boardId,
            taskId: draggableId,
            newColumnId: destination.droppableId,
            newPosition: destination.index
          }
        })
      );
    } catch (error) {
      // Rollback nếu lỗi
      console.error('Move task failed:', error);
      fetchTasks(); // Re-fetch to get correct state
    }
  };

  // 4. Organize tasks by column
  const getTasksByColumn = (columnId) => {
    return tasks
      .filter(t => t.columnId === columnId)
      .sort((a, b) => a.position - b.position);
  };

  if (loading) return <div className="loading">Loading board...</div>;

  return (
    <div className="board-view">
      <div className="board-header">
        <h1>{board.name}</h1>
        <div className="board-members">
          {board.members.map(member => (
            <img
              key={member.userId}
              src={member.avatarUrl}
              alt={member.displayName}
              className="member-avatar"
              title={member.displayName}
            />
          ))}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns-container">
          {board.columns
            .sort((a, b) => a.position - b.position)
            .map(column => (
              <Column
                key={column.id}
                column={column}
                tasks={getTasksByColumn(column.id)}
                boardId={board.boardId}
              />
            ))
          }
        </div>
      </DragDropContext>
    </div>
  );
};

export default BoardView;
```

### Component: Column

```jsx
// components/Board/Column.jsx
import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from '../Task/TaskCard';
import CreateTaskForm from '../Task/CreateTaskForm';

const Column = ({ column, tasks, boardId }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="column">
      <div className="column-header">
        <h3>{column.name}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            className={`column-content ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.taskId}
                task={task}
                index={index}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {showCreateForm ? (
        <CreateTaskForm
          boardId={boardId}
          columnId={column.id}
          position={tasks.length}
          onClose={() => setShowCreateForm(false)}
        />
      ) : (
        <button
          className="add-task-btn"
          onClick={() => setShowCreateForm(true)}
        >
          + Add task
        </button>
      )}
    </div>
  );
};

export default Column;
```

### Component: TaskCard (Draggable)

```jsx
// components/Task/TaskCard.jsx
import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import TaskDetail from './TaskDetail';

const TaskCard = ({ task, index }) => {
  const [showDetail, setShowDetail] = useState(false);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#eab308';
      case 'LOW': return '#22c55e';
      default: return '#94a3b8';
    }
  };

  return (
    <>
      <Draggable draggableId={task.taskId} index={index}>
        {(provided, snapshot) => (
          <div
            className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setShowDetail(true)}
          >
            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
              <div className="task-labels">
                {task.labels.map(label => (
                  <span key={label} className="label-badge">{label}</span>
                ))}
              </div>
            )}

            {/* Title */}
            <h4 className="task-title">{task.title}</h4>

            {/* Footer */}
            <div className="task-footer">
              {/* Priority indicator */}
              <span
                className="priority-dot"
                style={{ backgroundColor: getPriorityColor(task.priority) }}
                title={task.priority}
              />

              {/* Due date */}
              {task.dueDate && (
                <span className="due-date">
                  📅 {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                </span>
              )}

              {/* Assignee */}
              {task.assigneeName && (
                <span className="assignee-badge">
                  {task.assigneeName.charAt(0)}
                </span>
              )}
            </div>
          </div>
        )}
      </Draggable>

      {/* Task Detail Modal */}
      {showDetail && (
        <TaskDetail
          task={task}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
};

export default TaskCard;
```

## 7.3 Kết Nối Realtime với AppSync

### AWS Amplify Configuration

```javascript
// src/utils/amplifyConfig.js
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    region: 'ap-southeast-1',
    userPoolId: 'ap-southeast-1_XXXXXXXX',
    userPoolWebClientId: 'your-client-id',
  },
  API: {
    GraphQL: {
      endpoint: 'https://your-api-id.appsync-api.ap-southeast-1.amazonaws.com/graphql',
      region: 'ap-southeast-1',
      defaultAuthMode: 'userPool'
    }
  },
  Storage: {
    S3: {
      bucket: 'taskman-uploads',
      region: 'ap-southeast-1'
    }
  }
});
```

### Custom Hook: useBoard (Realtime)

```javascript
// hooks/useBoard.js
import { useState, useEffect, useCallback } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import * as queries from '../graphql/queries';
import * as subscriptions from '../graphql/subscriptions';

export function useBoard(boardId) {
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch initial data
  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true);
      const result = await API.graphql(
        graphqlOperation(queries.getBoard, { boardId })
      );
      setBoard(result.data.getBoard);
      setTasks(result.data.getBoard.tasks || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  // Setup subscriptions
  useEffect(() => {
    if (!boardId) return;

    fetchBoard();

    // Subscribe to all task changes
    const subs = [
      API.graphql(graphqlOperation(subscriptions.onTaskCreated, { boardId }))
        .subscribe({
          next: ({ value }) => {
            setTasks(prev => [...prev, value.data.onTaskCreated]);
          }
        }),

      API.graphql(graphqlOperation(subscriptions.onTaskUpdated, { boardId }))
        .subscribe({
          next: ({ value }) => {
            setTasks(prev =>
              prev.map(t =>
                t.taskId === value.data.onTaskUpdated.taskId
                  ? value.data.onTaskUpdated
                  : t
              )
            );
          }
        }),

      API.graphql(graphqlOperation(subscriptions.onTaskDeleted, { boardId }))
        .subscribe({
          next: ({ value }) => {
            setTasks(prev =>
              prev.filter(t => t.taskId !== value.data.onTaskDeleted.taskId)
            );
          }
        }),

      API.graphql(graphqlOperation(subscriptions.onBoardUpdated, { boardId }))
        .subscribe({
          next: ({ value }) => {
            setBoard(value.data.onBoardUpdated);
          }
        })
    ];

    // Cleanup
    return () => subs.forEach(s => s.unsubscribe());
  }, [boardId, fetchBoard]);

  return { board, tasks, loading, error, refetch: fetchBoard };
}
```

### Thư viện cần cài

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "aws-amplify": "^6.0.0",
    "@aws-amplify/ui-react": "^6.0.0",
    "@hello-pangea/dnd": "^16.5.0",
    "date-fns": "^2.30.0"
  }
}
```

> [!NOTE]
> **@hello-pangea/dnd** là fork maintainted của react-beautiful-dnd (deprecated).
> Cung cấp drag & drop mượt mà, accessible, và dễ sử dụng.
