# Phần 8: Hướng Dẫn Triển Khai AWS Từng Bước

## 8.1 Chuẩn Bị

### Prerequisites
```
✅ Tài khoản AWS (đăng ký Free Tier: https://aws.amazon.com/free)
✅ AWS CLI đã cài đặt và cấu hình
✅ Node.js >= 18 đã cài đặt
✅ npm hoặc yarn
✅ Git
```

### Cài đặt AWS CLI
```bash
# Windows: Download installer từ
# https://awscli.amazonaws.com/AWSCLIV2.msi

# Cấu hình credentials
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region name: ap-southeast-1    ← Singapore (gần VN nhất)
# Default output format: json
```

### Cài đặt AWS Amplify CLI
```bash
npm install -g @aws-amplify/cli
amplify configure
# → Mở browser → Tạo IAM user → Paste credentials
```

---

## 8.2 Step 1: Tạo React Project + Amplify Init

```bash
# 1. Tạo React project
npx create-react-app task-manager-frontend
cd task-manager-frontend

# 2. Cài đặt dependencies
npm install aws-amplify @aws-amplify/ui-react @hello-pangea/dnd react-router-dom date-fns

# 3. Initialize Amplify
amplify init

# ? Enter a name for the project: taskmanager
# ? Initialize the project with the above configuration? Yes
# ? Select the authentication method: AWS profile
# ? Please choose the profile: default
```

**Sau khi init, Amplify tạo:**
```
amplify/
├── backend/
│   └── backend-config.json
├── .config/
│   └── project-config.json
└── team-provider-info.json
```

---

## 8.3 Step 2: Tạo Amazon Cognito User Pool

```bash
amplify add auth

# ? Do you want to use default authentication and security configuration?
#   → Default configuration

# ? How do you want users to sign in?
#   → Email

# ? Do you want to configure advanced settings?
#   → No, I am done
```

**Kết quả**: Amplify tạo Cognito User Pool configuration.

### Verify trên AWS Console

```
1. Mở AWS Console → Cognito → User Pools
2. Kiểm tra User Pool đã được tạo
3. Lưu ý:
   - User Pool ID:  ap-southeast-1_XXXXXXXX
   - App Client ID: xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Test đăng ký/đăng nhập

```jsx
// Thêm vào App.js để test
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div>
          <h1>Hello {user.username}!</h1>
          <button onClick={signOut}>Sign out</button>
        </div>
      )}
    </Authenticator>
  );
}
```

---

## 8.4 Step 3: Tạo AppSync API + DynamoDB

```bash
amplify add api

# ? Select from one of the below mentioned services:
#   → GraphQL

# ? Here is the GraphQL API that we will create. Select a setting to edit or continue:
#   → Authorization modes

# ? Choose the default authorization type:
#   → Amazon Cognito User Pool

# ? Configure additional auth types?
#   → No

# ? Here is the GraphQL API that we will create. Select a setting to edit or continue:
#   → Continue

# ? Choose a schema template:
#   → Blank Schema
```

### Tạo GraphQL Schema

Thay nội dung file `amplify/backend/api/taskmanager/schema.graphql`:

```graphql
# ============================================
# User Profile
# ============================================
type User
  @model
  @auth(rules: [
    { allow: owner, ownerField: "userId" },
    { allow: private, operations: [read] }
  ])
{
  userId: ID! @primaryKey
  email: String!
  displayName: String!
  avatarUrl: String
  boardIds: [String]
  createdAt: AWSDateTime
  updatedAt: AWSDateTime
}

# ============================================
# Board
# ============================================
type Board
  @model
  @auth(rules: [
    { allow: owner, ownerField: "ownerId" },
    { allow: private, operations: [read, update] }
  ])
{
  boardId: ID! @primaryKey
  name: String!
  description: String
  ownerId: String!
  ownerName: String!
  columns: [Column]
  members: [BoardMember]
  backgroundColor: String
  tasks: [Task] @hasMany(indexName: "byBoard", fields: ["boardId"])
  createdAt: AWSDateTime
  updatedAt: AWSDateTime
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
  joinedAt: AWSDateTime
}

enum MemberRole {
  OWNER
  ADMIN
  MEMBER
}

# ============================================
# Task
# ============================================
type Task
  @model
  @auth(rules: [
    { allow: private }
  ])
{
  taskId: ID! @primaryKey(sortKeyFields: ["boardId"])
  boardId: String! @index(name: "byBoard", sortKeyFields: ["createdAt"])
  title: String!
  description: String
  columnId: String!
  position: Int!
  assigneeId: String @index(name: "byAssignee", sortKeyFields: ["updatedAt"])
  assigneeName: String
  createdBy: String!
  priority: Priority!
  dueDate: AWSDateTime
  labels: [String]
  createdAt: AWSDateTime
  updatedAt: AWSDateTime
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

# ============================================
# Activity Log
# ============================================
type ActivityLog
  @model
  @auth(rules: [
    { allow: private, operations: [read] }
  ])
{
  boardId: ID! @primaryKey(sortKeyFields: ["timestamp"])
  timestamp: AWSDateTime!
  logId: String!
  action: String!
  userId: String!
  userName: String!
  targetType: String!
  targetId: String!
  details: AWSJSON
}

# ============================================
# Custom Mutations cho business logic
# ============================================
type Mutation {
  moveTask(input: MoveTaskInput!): Task
    @function(name: "taskProcessor-${env}")

  inviteMember(input: InviteMemberInput!): Board
    @function(name: "boardManager-${env}")
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

# ============================================
# Subscriptions
# ============================================
type Subscription {
  onTaskByBoard(boardId: String!): Task
    @aws_subscribe(mutations: ["createTask", "updateTask", "deleteTask", "moveTask"])
}
```

### Push to AWS

```bash
amplify push

# ? Are you sure you want to continue? Yes
# ? Do you want to generate code for your newly created GraphQL API? Yes
# ? Choose the code generation language target: javascript
# ? Enter the file name pattern of graphql queries, mutations and subscriptions:
#   → src/graphql/**/*.js
# ? Do you want to generate/update all possible GraphQL operations? Yes
# ? Enter maximum statement depth: 2
```

**Amplify sẽ tạo tự động:**
```
✅ AppSync GraphQL API
✅ DynamoDB tables (Users, Boards, Tasks, ActivityLogs)
✅ IAM Roles
✅ Cognito integration với AppSync
✅ GraphQL resolvers
✅ Generated code: src/graphql/queries.js, mutations.js, subscriptions.js
```

---

## 8.5 Step 4: Tạo Lambda Functions

### Lambda 1: taskProcessor

```bash
amplify add function

# ? Select which capability you want to add: Lambda function (serverless function)
# ? Provide an AWS Lambda function name: taskProcessor
# ? Choose the runtime: NodeJS
# ? Choose the function template: Hello World
# ? Do you want to configure advanced settings? Yes
# ? Do you want to access other resources? Yes
#   → Select: api (taskmanager), storage
# ? Do you want to invoke this function on a recurring schedule? No
# ? Do you want to configure Lambda layers? No
```

**Thay nội dung `amplify/backend/function/taskProcessor/src/index.js`:**

```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

const TASKS_TABLE = process.env.API_TASKMANAGER_TASKSTABLE_NAME;
const BOARDS_TABLE = process.env.API_TASKMANAGER_BOARDSTABLE_NAME;
const ACTIVITY_TABLE = process.env.API_TASKMANAGER_ACTIVITYLOGSTABLE_NAME;

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  const { fieldName, arguments: args, identity } = event;
  const userId = identity.sub;

  switch (fieldName) {
    case 'moveTask':
      return await moveTask(args.input, userId);
    default:
      throw new Error(`Unknown field: ${fieldName}`);
  }
};

async function moveTask(input, userId) {
  const { boardId, taskId, newColumnId, newPosition } = input;
  const now = new Date().toISOString();

  // 1. Validate: user là member của board?
  const board = await dynamodb.get({
    TableName: BOARDS_TABLE,
    Key: { boardId }
  }).promise();

  if (!board.Item) throw new Error('Board not found');

  const isMember = board.Item.members.some(m => m.userId === userId);
  if (!isMember) throw new Error('Unauthorized');

  // 2. Lấy task hiện tại
  const task = await dynamodb.get({
    TableName: TASKS_TABLE,
    Key: { taskId, boardId }
  }).promise();

  if (!task.Item) throw new Error('Task not found');

  const oldColumnId = task.Item.columnId;

  // 3. Update task
  const result = await dynamodb.update({
    TableName: TASKS_TABLE,
    Key: { taskId, boardId },
    UpdateExpression: 'SET columnId = :col, #pos = :pos, updatedAt = :now',
    ExpressionAttributeNames: { '#pos': 'position' },
    ExpressionAttributeValues: {
      ':col': newColumnId,
      ':pos': newPosition,
      ':now': now
    },
    ReturnValues: 'ALL_NEW'
  }).promise();

  // 4. Ghi Activity Log
  await dynamodb.put({
    TableName: ACTIVITY_TABLE,
    Item: {
      boardId,
      timestamp: now,
      logId: `log-${uuidv4()}`,
      action: 'TASK_MOVED',
      userId,
      userName: identity.claims?.name || 'Unknown',
      targetType: 'TASK',
      targetId: taskId,
      details: JSON.stringify({
        taskTitle: task.Item.title,
        fromColumn: oldColumnId,
        toColumn: newColumnId
      })
    }
  }).promise();

  return result.Attributes;
}
```

### Lambda 2: streamProcessor (DynamoDB Streams)

```bash
amplify add function

# ? Function name: streamProcessor
# ? Runtime: NodeJS
# ? Template: Hello World
# ? Advanced settings: Yes
# ? Access other resources: Yes (api, sns)
```

```javascript
// amplify/backend/function/streamProcessor/src/index.js
const AWS = require('aws-sdk');
const sns = new AWS.SNS();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventSource !== 'aws:dynamodb') continue;

    const eventName = record.eventName;
    const newImage = AWS.DynamoDB.Converter.unmarshall(
      record.dynamodb.NewImage || {}
    );
    const oldImage = AWS.DynamoDB.Converter.unmarshall(
      record.dynamodb.OldImage || {}
    );

    let notifMessage = '';
    let notifType = '';

    switch (eventName) {
      case 'INSERT':
        notifType = 'TASK_CREATED';
        notifMessage = `Task mới "${newImage.title}" đã được tạo`;
        break;

      case 'MODIFY':
        if (oldImage.columnId !== newImage.columnId) {
          notifType = 'TASK_MOVED';
          notifMessage = `Task "${newImage.title}" đã chuyển column`;
        } else {
          notifType = 'TASK_UPDATED';
          notifMessage = `Task "${newImage.title}" đã được cập nhật`;
        }
        break;

      case 'REMOVE':
        notifType = 'TASK_DELETED';
        notifMessage = `Task "${oldImage.title}" đã bị xóa`;
        break;
    }

    if (notifMessage && SNS_TOPIC_ARN) {
      await sns.publish({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify({
          type: notifType,
          boardId: newImage.boardId || oldImage.boardId,
          message: notifMessage,
          timestamp: new Date().toISOString()
        }),
        Subject: 'Task Notification'
      }).promise();
    }
  }
};
```

---

## 8.6 Step 5: Cấu Hình Amazon SNS

```bash
# Tạo SNS Topic qua AWS CLI
aws sns create-topic --name task-notifications --region ap-southeast-1

# Output: TopicArn = arn:aws:sns:ap-southeast-1:123456789:task-notifications

# Subscribe email (test)
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-southeast-1:123456789:task-notifications \
  --protocol email \
  --notification-endpoint your-email@university.edu

# → Check email → Confirm subscription
```

### Kết nối DynamoDB Streams → Lambda

```bash
# 1. Lấy Stream ARN của Tasks table
aws dynamodbstreams list-streams --table-name Tasks-xxxx

# 2. Tạo event source mapping
aws lambda create-event-source-mapping \
  --function-name streamProcessor-dev \
  --event-source-arn arn:aws:dynamodb:ap-southeast-1:123456:table/Tasks-xxx/stream/xxx \
  --batch-size 10 \
  --starting-position LATEST
```

---

## 8.7 Step 6: Deploy Frontend

```bash
# 1. Add hosting
amplify add hosting

# ? Select the plugin module: Hosting with Amplify Console
# ? Choose a type: Manual deployment

# 2. Deploy
amplify publish

# → Amplify sẽ:
#   1. Build React app
#   2. Upload lên S3
#   3. Setup CloudFront CDN
#   4. Trả về URL: https://main.d1234abcdef.amplifyapp.com
```

---

## 8.8 Step 7: Test Realtime

### Test Plan

```
Test 1: Đăng ký + Đăng nhập
═══════════════════════════
1. Mở app → Click "Create Account"
2. Nhập email, password
3. Nhận email verification code → Nhập code
4. Đăng nhập thành công ✅

Test 2: Tạo Board
════════════════
1. Click "New Board"
2. Nhập tên: "Sprint 1"
3. Board xuất hiện trên Dashboard ✅

Test 3: Tạo Task
═══════════════
1. Mở board "Sprint 1"
2. Click "Add Task" trong column "To Do"
3. Nhập title: "Design homepage"
4. Task xuất hiện ✅

Test 4: Realtime (QUAN TRỌNG)
═════════════════════════════
1. Mở 2 browser tabs (hoặc 2 browsers khác nhau)
2. Đăng nhập với 2 tài khoản khác nhau
3. Cả 2 mở cùng 1 board
4. Tab 1: Kéo task "Design homepage" từ "To Do" → "In Progress"
5. Tab 2: Task "Design homepage" tự di chuyển sang "In Progress" ✅

Test 5: Notification
════════════════════
1. Sau khi kéo task ở Test 4
2. Check email của User 2
3. Nhận email notification ✅
```

### Debug nếu gặp lỗi

```
Lỗi phổ biến:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Lỗi                        │ Nguyên nhân + Fix            │
├─────────────────────────────┼──────────────────────────────┤
│ "Not Authorized"            │ Cognito token expired →      │
│                             │ Re-login                     │
├─────────────────────────────┼──────────────────────────────┤
│ Subscription không nhận data│ Kiểm tra boardId filter      │
│                             │ phải match chính xác         │
├─────────────────────────────┼──────────────────────────────┤
│ Lambda timeout              │ Tăng timeout trong           │
│                             │ amplify/backend/function/    │
│                             │ xxx/xxx-cloudformation.json  │
├─────────────────────────────┼──────────────────────────────┤
│ DynamoDB permission denied  │ Check IAM role của Lambda    │
│                             │ → Thêm DynamoDB permissions  │
├─────────────────────────────┼──────────────────────────────┤
│ SNS không gửi email        │ Verify email trong SNS       │
│                             │ Console → Confirm subscribe  │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> [!IMPORTANT]
> **Monitoring**: Luôn check **CloudWatch Logs** khi debug.
> - Mở AWS Console → CloudWatch → Log Groups
> - Tìm log group `/aws/lambda/taskProcessor-dev`
> - Xem logs để debug errors
