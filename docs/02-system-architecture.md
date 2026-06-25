# Phần 2: Thiết Kế Kiến Trúc Hệ Thống (AWS)

## 2.1 Tổng Quan Kiến Trúc

### Sơ đồ kiến trúc chi tiết

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                        SYSTEM ARCHITECTURE                                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ┌──────────┐  ┌──────────┐  ┌──────────┐                               ║
║  │ Browser  │  │ Browser  │  │ Browser  │    ← Frontend (React.js)       ║
║  │ User A   │  │ User B   │  │ User C   │                               ║
║  └────┬─────┘  └────┬─────┘  └────┬─────┘                               ║
║       │              │              │                                     ║
║       │         HTTPS + WSS         │                                     ║
║       │      (GraphQL Protocol)     │                                     ║
║       ▼              ▼              ▼                                     ║
║  ╔═══════════════════════════════════════╗                                ║
║  ║     Amazon CloudFront (CDN)           ║  ← Static hosting             ║
║  ╚═══════════════╤═══════════════════════╝                                ║
║                  │                                                        ║
║  ╔═══════════════▼═══════════════════════╗                                ║
║  ║     Amazon AppSync                    ║                                ║
║  ║     ┌───────────────────────────┐     ║                                ║
║  ║     │  GraphQL API              │     ║                                ║
║  ║     │  ├── Queries   (Read)     │     ║                                ║
║  ║     │  ├── Mutations (Write)    │     ║  ← API Gateway (GraphQL)      ║
║  ║     │  └── Subscriptions (WS)   │     ║                                ║
║  ║     └───────────────────────────┘     ║                                ║
║  ║     ┌───────────────────────────┐     ║                                ║
║  ║     │  Resolvers                │     ║                                ║
║  ║     │  ├── Direct (DynamoDB)    │     ║                                ║
║  ║     │  └── Lambda (Business)    │     ║                                ║
║  ║     └───────────────────────────┘     ║                                ║
║  ╚═══╤══════════╤══════════╤═════════════╝                                ║
║      │          │          │                                              ║
║      ▼          ▼          ▼                                              ║
║  ┌────────┐ ┌────────┐ ┌──────────────────┐                             ║
║  │Amazon  │ │AWS     │ │Amazon            │                             ║
║  │Cognito │ │Lambda  │ │DynamoDB          │                             ║
║  │        │ │        │ │                  │                             ║
║  │┌──────┐│ │┌──────┐│ │┌────────────────┐│                             ║
║  ││User  ││ ││Task  ││ ││ Users Table    ││                             ║
║  ││Pool  ││ ││Logic ││ ││ Boards Table   ││                             ║
║  │└──────┘│ │├──────┤│ ││ Tasks Table    ││                             ║
║  │┌──────┐│ ││Event ││ ││ Activity Table ││                             ║
║  ││Auth  ││ ││Proc. ││ │└────────────────┘│                             ║
║  ││Flow  ││ │├──────┤│ │                  │                             ║
║  │└──────┘│ ││Notif ││ │  DynamoDB Streams│──┐                          ║
║  └────────┘ ││Send  ││ └──────────────────┘  │                          ║
║             │└──────┘│                       │                          ║
║             └───┬────┘                       │                          ║
║                 │                            │                          ║
║                 ▼                            ▼                          ║
║  ┌──────────────────────────┐  ┌──────────────────────┐                 ║
║  │    Amazon SNS            │  │  AWS Lambda           │                 ║
║  │    (Notifications)       │  │  (Stream Processor)   │                 ║
║  │                          │  └──────────────────────┘                 ║
║  │  ┌──────┐ ┌──────┐      │                                           ║
║  │  │Email │ │Push  │      │                                           ║
║  │  │Topic │ │Topic │      │                                           ║
║  │  └──────┘ └──────┘      │                                           ║
║  └──────────────────────────┘                                           ║
║                                                                         ║
║  ┌──────────────────────────┐                                           ║
║  │    Amazon S3              │  ← File Storage (avatars, attachments)   ║
║  │    (Static Assets)        │                                           ║
║  └──────────────────────────┘                                           ║
║                                                                         ║
╚═════════════════════════════════════════════════════════════════════════╝
```

## 2.2 Chi Tiết Từng Service

### 🔷 Amazon AppSync (API Layer)

**Vai trò**: Là "cửa ngõ" duy nhất giữa frontend và backend

| Tính năng | Mô tả |
|-----------|--------|
| GraphQL API | Cung cấp API linh hoạt, client chỉ lấy data cần thiết |
| Subscriptions | WebSocket connections cho realtime updates |
| Authorization | Tích hợp Cognito để xác thực user |
| Resolvers | Kết nối trực tiếp DynamoDB hoặc gọi Lambda |
| Caching | Built-in caching giảm latency |

**Tại sao AppSync mà không phải API Gateway + Lambda?**
```
AppSync:
✅ Built-in GraphQL engine (không cần tự build)
✅ Built-in WebSocket cho realtime (Subscriptions)
✅ Direct DynamoDB resolvers (nhanh hơn, không cần Lambda)
✅ Offline support cho mobile
✅ Conflict resolution tự động

API Gateway + Lambda:
❌ Phải tự implement WebSocket
❌ Phải viết nhiều Lambda functions
❌ Không có GraphQL built-in
❌ Chi phí cao hơn do nhiều Lambda invocations
```

### 🟡 Amazon DynamoDB (Database)

**Vai trò**: Lưu trữ toàn bộ data của hệ thống

| Đặc điểm | Giá trị |
|-----------|---------|
| Loại database | NoSQL (key-value + document) |
| Latency | Single-digit millisecond |
| Scaling | Tự động, không giới hạn |
| Pricing | On-demand hoặc provisioned |
| DynamoDB Streams | Capture mọi thay đổi data (event source) |

**DynamoDB Streams** là yếu tố quan trọng cho event-driven architecture:
```
User tạo task → DynamoDB ghi record mới
                     │
                     ▼
              DynamoDB Streams capture event
                     │
                     ▼
              Lambda được trigger tự động
                     │
                     ▼
              Gửi notification qua SNS
```

### 🟢 Amazon Cognito (Authentication)

**Vai trò**: Quản lý toàn bộ việc đăng ký, đăng nhập, xác thực

| Tính năng | Mô tả |
|-----------|--------|
| User Pool | Quản lý danh sách user |
| Sign-up/Sign-in | Hỗ trợ email, phone, social login |
| JWT Tokens | Cấp token cho xác thực API |
| MFA | Xác thực 2 yếu tố (optional) |
| Hosted UI | Giao diện đăng nhập có sẵn |

**Flow xác thực:**
```
1. User đăng nhập → Cognito xác thực
2. Cognito trả về 3 tokens:
   ├── ID Token:      chứa thông tin user (name, email...)
   ├── Access Token:  dùng để gọi API
   └── Refresh Token: dùng để lấy token mới khi hết hạn
3. Frontend gửi Access Token trong header mỗi request
4. AppSync verify token tự động
```

### 🔵 AWS Lambda (Business Logic)

**Vai trò**: Xử lý logic phức tạp mà DynamoDB resolvers không làm được

| Lambda Function | Nhiệm vụ |
|----------------|-----------|
| `taskProcessor` | Xử lý logic khi tạo/sửa/xóa task |
| `notificationSender` | Gửi notification qua SNS |
| `boardManager` | Xử lý invite member, permission |
| `streamProcessor` | Xử lý events từ DynamoDB Streams |

**Khi nào dùng Lambda vs Direct DynamoDB Resolver?**
```
Direct DynamoDB Resolver (Nhanh + Rẻ):
✅ Đọc/ghi đơn giản: getTask, listBoards
✅ Không cần business logic phức tạp
✅ CRUD operations đơn giản

Lambda Resolver (Linh hoạt):
✅ Cần validation phức tạp
✅ Cần ghi nhiều bảng cùng lúc (transaction)
✅ Cần gọi service khác (SNS, SES)
✅ Cần business logic (check permission, calculate...)
```

### 🟠 Amazon SNS (Notification)

**Vai trò**: Gửi thông báo đến user khi có thay đổi

| Topic | Mô tả |
|-------|--------|
| `task-notifications` | Thông báo thay đổi task |
| `board-notifications` | Thông báo mời vào board |

### 📦 Amazon S3 (Storage)

**Vai trò**: Lưu trữ file tĩnh

| Bucket | Nội dung |
|--------|----------|
| `taskman-frontend` | React build files (hosting) |
| `taskman-uploads` | File đính kèm, avatar |

---

## 2.3 Event-Driven Architecture - Giải Thích Chi Tiết

### Event là gì trong hệ thống này?

> **Event** = Một sự kiện xảy ra trong hệ thống, mô tả "điều gì đã xảy ra"

**Ví dụ các event:**

```json
// Event: TaskCreated
{
  "eventType": "TASK_CREATED",
  "timestamp": "2026-05-05T10:00:00Z",
  "data": {
    "taskId": "task-123",
    "boardId": "board-456",
    "title": "Design homepage",
    "createdBy": "user-789",
    "column": "TODO"
  }
}

// Event: TaskMoved
{
  "eventType": "TASK_MOVED",
  "timestamp": "2026-05-05T10:05:00Z",
  "data": {
    "taskId": "task-123",
    "boardId": "board-456",
    "fromColumn": "TODO",
    "toColumn": "IN_PROGRESS",
    "movedBy": "user-789"
  }
}
```

### Flow khi User Update Task (End-to-End)

```
Step 1: User Action
═══════════════════
User A kéo task "Design homepage" từ "TODO" sang "IN_PROGRESS"
    │
    ▼
Step 2: Frontend gửi GraphQL Mutation
═══════════════════════════════════════
mutation moveTask {
  moveTask(input: {
    taskId: "task-123"
    boardId: "board-456"
    newColumn: "IN_PROGRESS"
    newPosition: 0
  }) {
    taskId
    column
    position
    updatedAt
  }
}
    │
    ▼
Step 3: AppSync nhận request
═════════════════════════════
AppSync verify JWT token → Kiểm tra user có quyền
    │
    ▼
Step 4: Lambda Resolver được gọi
═════════════════════════════════
Lambda function "moveTask":
  1. Validate input (task tồn tại? user có quyền?)
  2. Update task trong DynamoDB (column + position + updatedAt)
  3. Ghi Activity Log vào DynamoDB
  4. Return result
    │
    ▼
Step 5: DynamoDB lưu data + Trigger Stream
═══════════════════════════════════════════
DynamoDB:
  1. Cập nhật record task
  2. DynamoDB Streams capture thay đổi
    │
    ├──────────────────────────────────┐
    ▼                                  ▼
Step 6a: AppSync Subscription        Step 6b: DynamoDB Stream → Lambda
═════════════════════════════        ═════════════════════════════════
AppSync broadcast event              Lambda "streamProcessor":
qua WebSocket đến tất cả              1. Đọc event từ stream
user đang subscribe board              2. Xác định ai cần nhận notification
    │                                  3. Publish message lên SNS
    ▼                                      │
User B, C thấy task                        ▼
di chuyển realtime                  Step 7: SNS gửi notification
trên giao diện                     ══════════════════════════════
                                   SNS:
                                     1. Gửi email cho assignee
                                     2. Push notification (nếu có)
                                     3. In-app notification
```

### Tại sao Event-Driven?

```
┌─────────────────────────────────────────────────────────┐
│                 TRUYỀN THỐNG (Monolithic)                │
│                                                          │
│  User kéo task → Server xử lý → Ghi DB                 │
│                              → Gửi email                │
│                              → Update cache             │
│                              → Gửi notification         │
│                              → Ghi log                  │
│                                                          │
│  ❌ Tất cả trong 1 request → Chậm                       │
│  ❌ 1 service lỗi → Toàn bộ lỗi                        │
│  ❌ Khó mở rộng                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 EVENT-DRIVEN (Serverless)                │
│                                                          │
│  User kéo task → AppSync → Lambda → Ghi DB             │
│                                       │                  │
│                                   (Event phát ra)        │
│                                       │                  │
│                              ┌────────┼────────┐        │
│                              ▼        ▼        ▼        │
│                          Realtime   Email   Log         │
│                          Update     Send    Write       │
│                                                          │
│  ✅ Request chính xong nhanh (chỉ ghi DB)              │
│  ✅ Các việc khác chạy bất đồng bộ (async)             │
│  ✅ 1 service lỗi → Các service khác vẫn ok            │
│  ✅ Dễ thêm tính năng mới (thêm subscriber)            │
└─────────────────────────────────────────────────────────┘
```

## 2.4 Luồng Dữ Liệu End-to-End (Data Flow)

### Flow 1: User Đăng Ký

```
React App → Cognito Sign Up API
    │
    ▼
Cognito tạo user → Gửi email verification
    │
    ▼
User verify email → Cognito xác nhận
    │
    ▼
React App gọi mutation createUserProfile
    │
    ▼
AppSync → Lambda → DynamoDB (Users table)
    │
    ▼
User profile được tạo → Redirect to Dashboard
```

### Flow 2: Tạo Board

```
React App → mutation createBoard
    │
    ▼
AppSync → Lambda resolver
    │
    ├── Validate: user đã đăng nhập?
    ├── Tạo record trong Boards table
    ├── Thêm user là owner trong BoardMembers
    └── Return board data
    │
    ▼
React App hiển thị board mới
```

### Flow 3: Tạo Task

```
React App → mutation createTask
    │
    ▼
AppSync → Lambda resolver
    │
    ├── Validate: user có quyền trên board?
    ├── Tạo record trong Tasks table
    ├── Ghi Activity Log
    └── Return task data
    │
    ▼
AppSync Subscription broadcast "onTaskCreated"
    │
    ▼
Tất cả user đang subscribe board → nhận task mới realtime

Đồng thời (async):
DynamoDB Stream → Lambda → SNS → Notification cho members
```

### Flow 4: Kéo Thả Task (Quan trọng nhất)

```
React App: User kéo task từ "TODO" → "IN_PROGRESS"
    │
    ▼
Optimistic Update: UI cập nhật NGAY (không đợi server)
    │
    ▼
Gửi mutation moveTask đến AppSync
    │
    ▼
AppSync → Lambda resolver
    │
    ├── Validate: user có quyền? task tồn tại?
    ├── Update task: column = "IN_PROGRESS", position = newPos
    ├── Update positions của các task khác trong column
    ├── Ghi Activity Log
    └── Return updated task
    │
    ├──────────────────────────────────────┐
    ▼                                      ▼
AppSync Subscription                  DynamoDB Stream
"onTaskUpdated" broadcast             → Lambda streamProcessor
    │                                      │
    ▼                                      ▼
User B, C thấy task                   SNS → Email notification
di chuyển trên board                  "Task 'Design homepage'
                                       moved to IN_PROGRESS
                                       by User A"
```

> [!IMPORTANT]
> **Optimistic Update** là kỹ thuật quan trọng: UI cập nhật ngay lập tức TRƯỚC KHI server phản hồi.
> Nếu server trả lỗi, UI sẽ rollback lại trạng thái cũ.
> Điều này giúp UX mượt mà, user không cảm thấy lag.

## 2.5 Tóm Tắt Vai Trò Từng Service

```
┌─────────────────────────────────────────────────────────────┐
│ Service          │ Vai trò              │ Tương tác với     │
├─────────────────────────────────────────────────────────────┤
│ CloudFront + S3  │ Hosting frontend     │ Browser           │
│ Cognito          │ Authentication       │ AppSync, Frontend │
│ AppSync          │ API Gateway + WS     │ Tất cả services   │
│ Lambda           │ Business Logic       │ DynamoDB, SNS     │
│ DynamoDB         │ Database             │ Lambda, AppSync   │
│ DynamoDB Streams │ Event Source         │ Lambda            │
│ SNS              │ Notifications        │ Lambda, Email     │
│ S3               │ File Storage         │ Frontend, Lambda  │
│ CloudWatch       │ Monitoring & Logs    │ Lambda, AppSync   │
│ IAM              │ Access Control       │ Tất cả services   │
└─────────────────────────────────────────────────────────────┘
```
