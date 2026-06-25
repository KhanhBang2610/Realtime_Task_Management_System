# Phần 3: Thiết Kế Database (DynamoDB)

## 3.1 Tại Sao Dùng NoSQL (DynamoDB)?

### So sánh SQL vs NoSQL cho hệ thống này

| Tiêu chí | SQL (RDS/Aurora) | NoSQL (DynamoDB) | Winner |
|-----------|------------------|------------------|--------|
| **Latency** | 5-20ms | 1-5ms | ✅ DynamoDB |
| **Scaling** | Vertical (scale up) | Horizontal (tự động) | ✅ DynamoDB |
| **Chi phí** | Phải chạy 24/7 (~$15/tháng) | Pay-per-request | ✅ DynamoDB |
| **Serverless** | Aurora Serverless (đắt) | Native serverless | ✅ DynamoDB |
| **Free tier** | 750h/tháng (1 instance) | 25GB + 25 WCU/RCU | ✅ DynamoDB |
| **Schema** | Cố định (ALTER TABLE) | Linh hoạt (schemaless) | ✅ DynamoDB |
| **Streams** | Không có sẵn | DynamoDB Streams | ✅ DynamoDB |
| **Complex queries** | JOINs, subqueries | Hạn chế | ✅ SQL |
| **Relationships** | Foreign keys | Denormalization | ✅ SQL |

### Kết luận: DynamoDB phù hợp vì

1. **Cost**: Sinh viên dùng Free Tier, gần như miễn phí
2. **Performance**: Latency cực thấp cho realtime app
3. **Serverless**: Không cần quản lý database server
4. **Streams**: Hỗ trợ event-driven architecture
5. **Data model**: Task management data không cần complex JOINs

> [!NOTE]
> **NoSQL Trade-off**: Ta phải "denormalize" data (lặp lại một số data) để tránh JOIN.
> Ví dụ: Trong task, ta lưu luôn `assigneeName` thay vì chỉ lưu `assigneeId` rồi JOIN với Users table.
> Điều này ok vì tên user ít thay đổi, và giúp query nhanh hơn rất nhiều.

---

## 3.2 Thiết Kế Các Bảng

### Chiến lược thiết kế

Ta sẽ dùng **multi-table design** (mỗi entity 1 bảng) thay vì single-table design vì:
- Dễ hiểu hơn cho sinh viên
- Dễ maintain và debug
- AppSync resolvers hoạt động tốt với multi-table
- Không cần complex access patterns

---

### 📋 Bảng 1: Users

**Mục đích**: Lưu thông tin profile của user (bổ sung cho Cognito)

```
Table Name: Users
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Attribute      │ Type   │ Key          │ Mô tả              │
├────────────────┼────────┼──────────────┼─────────────────────┤
│ userId         │ String │ Partition Key│ Cognito sub (UUID)  │
│ email          │ String │ GSI-1 PK     │ Email đăng ký       │
│ displayName    │ String │              │ Tên hiển thị        │
│ avatarUrl      │ String │              │ Link avatar (S3)    │
│ createdAt      │ String │              │ ISO 8601 timestamp  │
│ updatedAt      │ String │              │ ISO 8601 timestamp  │
│ boardIds       │ List   │              │ Danh sách board IDs │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GSI (Global Secondary Index):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ GSI Name       │ Partition Key │ Sort Key      │
├────────────────┼───────────────┼───────────────┤
│ EmailIndex     │ email         │ -             │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Ví dụ data:**
```json
{
  "userId": "cognito-sub-abc123",
  "email": "student@university.edu",
  "displayName": "Nguyễn Văn A",
  "avatarUrl": "https://s3.amazonaws.com/taskman-uploads/avatars/abc123.jpg",
  "createdAt": "2026-05-05T10:00:00Z",
  "updatedAt": "2026-05-05T10:00:00Z",
  "boardIds": ["board-001", "board-002"]
}
```

**Queries trên bảng Users:**
```
1. GetUser by userId     → PK lookup  → O(1) - cực nhanh
2. GetUser by email      → GSI lookup → O(1) - cực nhanh
3. ListUserBoards        → PK lookup  → Lấy boardIds, rồi BatchGetItem
```

---

### 📊 Bảng 2: Boards

**Mục đích**: Lưu thông tin board và danh sách thành viên

```
Table Name: Boards
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Attribute       │ Type   │ Key          │ Mô tả                   │
├─────────────────┼────────┼──────────────┼──────────────────────────┤
│ boardId         │ String │ Partition Key│ UUID v4                  │
│ name            │ String │              │ Tên board                │
│ description     │ String │              │ Mô tả board              │
│ ownerId         │ String │ GSI-1 PK     │ userId của owner         │
│ columns         │ List   │              │ Danh sách column configs │
│ members         │ List   │              │ List {userId, role, name}│
│ backgroundColor │ String │              │ Màu nền board            │
│ createdAt       │ String │ GSI-1 SK     │ ISO 8601 timestamp       │
│ updatedAt       │ String │              │ ISO 8601 timestamp       │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GSI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ GSI Name         │ Partition Key │ Sort Key       │
├──────────────────┼───────────────┼────────────────┤
│ OwnerIndex       │ ownerId       │ createdAt      │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Ví dụ data:**
```json
{
  "boardId": "board-001",
  "name": "Sprint 1 - Team Alpha",
  "description": "Quản lý công việc Sprint 1",
  "ownerId": "cognito-sub-abc123",
  "columns": [
    { "id": "col-1", "name": "To Do", "position": 0 },
    { "id": "col-2", "name": "In Progress", "position": 1 },
    { "id": "col-3", "name": "Review", "position": 2 },
    { "id": "col-4", "name": "Done", "position": 3 }
  ],
  "members": [
    { "userId": "cognito-sub-abc123", "role": "OWNER", "displayName": "Nguyễn Văn A" },
    { "userId": "cognito-sub-def456", "role": "MEMBER", "displayName": "Trần Thị B" },
    { "userId": "cognito-sub-ghi789", "role": "MEMBER", "displayName": "Lê Văn C" }
  ],
  "backgroundColor": "#1e40af",
  "createdAt": "2026-05-05T10:00:00Z",
  "updatedAt": "2026-05-05T11:30:00Z"
}
```

> [!TIP]
> **Denormalization**: Ta lưu `displayName` trong `members` list thay vì chỉ `userId`.
> Khi hiển thị board, không cần query thêm Users table → Nhanh hơn + Ít tốn read capacity.

---

### ✅ Bảng 3: Tasks

**Mục đích**: Lưu thông tin chi tiết từng task

```
Table Name: Tasks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Attribute       │ Type   │ Key          │ Mô tả                    │
├─────────────────┼────────┼──────────────┼───────────────────────────┤
│ boardId         │ String │ Partition Key│ Board chứa task           │
│ taskId          │ String │ Sort Key     │ UUID v4                   │
│ title           │ String │              │ Tiêu đề task              │
│ description     │ String │              │ Mô tả chi tiết            │
│ columnId        │ String │              │ Column hiện tại           │
│ position        │ Number │              │ Vị trí trong column       │
│ assigneeId      │ String │ GSI-1 PK     │ userId người được assign  │
│ assigneeName    │ String │              │ Tên người được assign     │
│ createdBy       │ String │              │ userId người tạo          │
│ priority        │ String │              │ LOW / MEDIUM / HIGH       │
│ dueDate         │ String │              │ Deadline (ISO 8601)       │
│ labels          │ List   │              │ Tags / labels             │
│ attachments     │ List   │              │ File URLs (S3)            │
│ createdAt       │ String │              │ ISO 8601 timestamp        │
│ updatedAt       │ String │ GSI-1 SK     │ ISO 8601 timestamp        │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GSI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ GSI Name         │ Partition Key │ Sort Key          │
├──────────────────┼───────────────┼───────────────────┤
│ AssigneeIndex    │ assigneeId    │ updatedAt         │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Ví dụ data:**
```json
{
  "boardId": "board-001",
  "taskId": "task-abc-123",
  "title": "Design homepage mockup",
  "description": "Thiết kế mockup cho trang chủ theo wireframe đã duyệt",
  "columnId": "col-2",
  "position": 0,
  "assigneeId": "cognito-sub-def456",
  "assigneeName": "Trần Thị B",
  "createdBy": "cognito-sub-abc123",
  "priority": "HIGH",
  "dueDate": "2026-05-10T23:59:59Z",
  "labels": ["design", "frontend"],
  "attachments": [
    {
      "fileName": "wireframe.png",
      "url": "https://s3.amazonaws.com/taskman-uploads/board-001/wireframe.png",
      "uploadedAt": "2026-05-05T11:00:00Z"
    }
  ],
  "createdAt": "2026-05-05T10:30:00Z",
  "updatedAt": "2026-05-05T14:20:00Z"
}
```

**Tại sao `boardId` là Partition Key và `taskId` là Sort Key?**
```
Query pattern chính: "Lấy tất cả tasks trong 1 board"
→ Query by PK (boardId) → Trả về TẤT CẢ tasks của board đó
→ Cực nhanh, 1 query duy nhất

Nếu dùng taskId làm PK:
→ Phải biết taskId trước → Không query được theo board
→ Phải scan toàn bộ table → Chậm + tốn tiền
```

---

### 📝 Bảng 4: ActivityLogs (Optional)

**Mục đích**: Ghi lại lịch sử hoạt động (audit trail)

```
Table Name: ActivityLogs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Attribute       │ Type   │ Key          │ Mô tả                    │
├─────────────────┼────────┼──────────────┼───────────────────────────┤
│ boardId         │ String │ Partition Key│ Board liên quan           │
│ timestamp       │ String │ Sort Key     │ ISO 8601 (để sort theo    │
│                 │        │              │ thời gian)                │
│ logId           │ String │              │ UUID v4                   │
│ action          │ String │              │ TASK_CREATED, TASK_MOVED..│
│ userId          │ String │              │ Người thực hiện           │
│ userName        │ String │              │ Tên người thực hiện       │
│ targetType      │ String │              │ TASK / BOARD / MEMBER     │
│ targetId        │ String │              │ ID của đối tượng          │
│ details         │ Map    │              │ Chi tiết thay đổi         │
│ ttl             │ Number │              │ Time-to-live (auto delete)│
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Ví dụ data:**
```json
{
  "boardId": "board-001",
  "timestamp": "2026-05-05T14:20:00.000Z",
  "logId": "log-xyz-789",
  "action": "TASK_MOVED",
  "userId": "cognito-sub-abc123",
  "userName": "Nguyễn Văn A",
  "targetType": "TASK",
  "targetId": "task-abc-123",
  "details": {
    "taskTitle": "Design homepage mockup",
    "fromColumn": "To Do",
    "toColumn": "In Progress"
  },
  "ttl": 1654444800
}
```

> [!TIP]
> **TTL (Time-to-Live)**: Tự động xóa log sau 30 ngày → Tiết kiệm storage.
> `ttl = currentTime + 30 * 24 * 60 * 60` (30 ngày tính bằng giây, Unix timestamp)

---

## 3.3 Sơ Đồ Quan Hệ Giữa Các Bảng

```
┌──────────────┐         ┌──────────────┐
│    Users     │         │    Boards    │
│              │◄────────│              │
│ PK: userId   │ownerId  │ PK: boardId  │
│              │         │              │
│ email        │ members[│ name         │
│ displayName  │  userId]│ ownerId      │
│ boardIds[]   │─────────│ columns[]    │
│              │         │ members[]    │
└──────────────┘         └──────┬───────┘
                                │
                                │ boardId (PK of Tasks)
                                │
                         ┌──────▼───────┐
                         │    Tasks     │
                         │              │
                         │ PK: boardId  │
                         │ SK: taskId   │
                         │              │
                         │ title        │
                         │ columnId     │
                         │ assigneeId   │
                         │ position     │
                         └──────┬───────┘
                                │
                                │ boardId (PK of ActivityLogs)
                                │
                         ┌──────▼───────┐
                         │ActivityLogs  │
                         │              │
                         │ PK: boardId  │
                         │ SK: timestamp│
                         │              │
                         │ action       │
                         │ userId       │
                         │ details      │
                         └──────────────┘
```

## 3.4 Cách Tối Ưu Query

### Access Patterns (Các cách truy vấn)

| # | Access Pattern | Table | Operation | Key condition |
|---|---------------|-------|-----------|---------------|
| 1 | Lấy profile user | Users | GetItem | PK = userId |
| 2 | Tìm user theo email | Users | Query GSI | EmailIndex: PK = email |
| 3 | Lấy board theo ID | Boards | GetItem | PK = boardId |
| 4 | Lấy boards của user | Boards | Query GSI | OwnerIndex: PK = ownerId |
| 5 | Lấy tất cả tasks trong board | Tasks | Query | PK = boardId |
| 6 | Lấy 1 task cụ thể | Tasks | GetItem | PK = boardId, SK = taskId |
| 7 | Lấy tasks assigned cho user | Tasks | Query GSI | AssigneeIndex: PK = assigneeId |
| 8 | Lấy activity log của board | ActivityLogs | Query | PK = boardId, SK begins_with |
| 9 | Lấy nhiều boards cùng lúc | Boards | BatchGetItem | List of boardIds |

### Tips tối ưu

```
1. ĐỌC (Read):
   ─────────────
   ✅ Dùng GetItem khi biết exact key → 1 RCU cho item ≤ 4KB
   ✅ Dùng Query khi cần range → Efficient, chỉ đọc matching items
   ✅ Dùng BatchGetItem khi cần nhiều items → 1 request thay vì N requests
   ❌ TRÁNH Scan → Đọc toàn bộ table, tốn nhiều RCU

2. GHI (Write):
   ─────────────
   ✅ Dùng PutItem cho create → 1 WCU cho item ≤ 1KB
   ✅ Dùng UpdateItem cho partial update → Chỉ update attributes cần thiết
   ✅ Dùng TransactWriteItems khi cần ghi nhiều bảng atomic

3. DESIGN:
   ────────
   ✅ Denormalize data → Giảm số lần query
   ✅ Dùng GSI cho access patterns phụ
   ✅ TTL cho data tạm thời (logs)
   ✅ On-demand capacity → Không cần dự đoán traffic
```

### Ví dụ so sánh: Query tối ưu vs không tối ưu

```javascript
// ❌ KHÔNG TỐI ƯU: Lấy tất cả boards của user
// Cách sai: Scan toàn bộ Boards table, filter theo member
const params = {
  TableName: 'Boards',
  FilterExpression: 'contains(members, :userId)',
  ExpressionAttributeValues: { ':userId': userId }
};
// → Scan TOÀN BỘ table → Chậm + Tốn tiền!

// ✅ TỐI ƯU: Lấy boardIds từ User, rồi BatchGetItem
// Bước 1: Lấy user profile (1 read)
const user = await dynamodb.getItem({
  TableName: 'Users',
  Key: { userId: userId }
});

// Bước 2: BatchGetItem cho các boards (1 request)
const boards = await dynamodb.batchGetItem({
  RequestItems: {
    'Boards': {
      Keys: user.boardIds.map(id => ({ boardId: id }))
    }
  }
});
// → Chỉ 2 requests, chỉ đọc data cần thiết → Nhanh + Rẻ!
```

## 3.5 DynamoDB Streams Configuration

```
Bảng cần bật Streams:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Table        │ Stream      │ Mục đích              │
├──────────────┼─────────────┼───────────────────────┤
│ Tasks        │ NEW_AND_OLD │ Detect task changes   │
│              │ _IMAGES     │ → Trigger notification│
├──────────────┼─────────────┼───────────────────────┤
│ Boards       │ NEW_IMAGE   │ Detect member changes │
│              │             │ → Trigger notification│
├──────────────┼─────────────┼───────────────────────┤
│ Users        │ Không cần   │ Ít thay đổi           │
├──────────────┼─────────────┼───────────────────────┤
│ ActivityLogs │ Không cần   │ Write-only, không     │
│              │             │ cần trigger           │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stream View Type "NEW_AND_OLD_IMAGES":
→ Capture CẢ data trước và sau khi thay đổi
→ Có thể so sánh để biết exactly cái gì thay đổi
→ Ví dụ: columnId thay đổi từ "col-1" → "col-2" = Task đã được MOVED
```
