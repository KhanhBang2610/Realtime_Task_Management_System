# Phần 10-13: Scaling, Security, Demo & Báo Cáo

---

# 10. Scaling & Best Practices

## 10.1 Serverless Scaling - Tại sao không cần lo?

```
KIẾN TRÚC TRUYỀN THỐNG:
═══════════════════════
Traffic tăng → Server quá tải → Phải:
  1. Mua thêm server ($$$$)
  2. Cấu hình Load Balancer
  3. Setup auto-scaling groups
  4. Monitor CPU, RAM, disk
  5. Hire DevOps engineer ($$$)

KIẾN TRÚC SERVERLESS (Project này):
════════════════════════════════════
Traffic tăng → AWS TỰ ĐỘNG scale → Bạn không cần làm gì!

┌──────────────────────────────────────────────────────────┐
│ Service     │ Scaling Behavior              │ Limit      │
├─────────────┼───────────────────────────────┼────────────┤
│ AppSync     │ Tự động scale, không giới hạn │ Soft limit │
│ Lambda      │ Tự động tạo thêm instances    │ 1000 conc. │
│ DynamoDB    │ On-demand: tự động scale      │ Unlimited  │
│ Cognito     │ Tự động scale                 │ 50K MAU fr │
│ SNS         │ Tự động scale                 │ Unlimited  │
│ S3          │ Tự động scale                 │ Unlimited  │
└──────────────────────────────────────────────────────────┘
```

## 10.2 Scaling Strategies Khi Có Nhiều User

### 10 → 100 Users (Vẫn Free Tier)
```
Không cần thay đổi gì!
✅ DynamoDB On-demand handles tự động
✅ Lambda tự scale
✅ AppSync tự scale
```

### 100 → 1,000 Users
```
Cân nhắc:
1. DynamoDB: Chuyển sang Provisioned mode + Auto-scaling
   → Tiết kiệm chi phí hơn On-demand khi traffic ổn định
   
2. AppSync: Enable caching
   → Giảm số lần query DynamoDB
   → Đặc biệt cho query getBoard (data ít thay đổi)

3. Lambda: Provisioned Concurrency cho critical functions
   → Giảm cold start time
   → Chỉ dùng cho functions quan trọng (moveTask)
```

### 1,000 → 10,000 Users
```
Cần thêm:
1. CloudFront: Cache static assets + API responses
2. DAX (DynamoDB Accelerator): In-memory cache cho DynamoDB
3. Lambda@Edge: Xử lý logic ở edge locations
4. Multi-region: Deploy ở nhiều regions (nếu users global)

Kiến trúc mở rộng:
┌─────────┐    ┌──────────┐    ┌──────────┐
│ Users   │───►│CloudFront│───►│ AppSync  │
│(global) │    │ (CDN)    │    │ (cached) │
└─────────┘    └──────────┘    └────┬─────┘
                                    │
                              ┌─────┼─────┐
                              ▼     ▼     ▼
                           Lambda  DAX   DynamoDB
                                   │     (Multi-AZ)
                                   └──►  Auto-scaling
```

## 10.3 Best Practices

```
1. 📝 Infrastructure as Code (IaC)
   ├── Dùng Amplify CLI hoặc AWS CDK
   ├── Version control infrastructure
   └── Reproducible deployments

2. 🔍 Monitoring & Alerting
   ├── CloudWatch Dashboards
   ├── CloudWatch Alarms (error rate, latency)
   ├── X-Ray for distributed tracing
   └── Budget alerts ($5/month threshold)

3. 🌍 Multi-environment
   ├── Dev: amplify env add dev
   ├── Staging: amplify env add staging
   └── Production: amplify env add prod

4. 🔄 CI/CD Pipeline
   ├── Amplify Console auto-deploy on git push
   ├── Run tests before deploy
   └── Rollback capability

5. ⚡ Performance
   ├── Lambda cold start optimization
   ├── DynamoDB query optimization (avoid Scans!)
   ├── AppSync caching
   └── Frontend code splitting
```

---

# 11. Security

## 11.1 IAM Roles

```
┌──────────────────────────────────────────────────────────────┐
│                    IAM ROLE ARCHITECTURE                      │
│                                                               │
│  ┌─────────────────────────────────────────────────┐         │
│  │ AppSync Service Role                             │         │
│  │ ├── Invoke Lambda functions                      │         │
│  │ ├── Read/Write DynamoDB tables                   │         │
│  │ └── NO access to S3, SNS, etc.                   │         │
│  └─────────────────────────────────────────────────┘         │
│                                                               │
│  ┌─────────────────────────────────────────────────┐         │
│  │ Lambda Execution Role (taskProcessor)            │         │
│  │ ├── Read/Write: Tasks, Boards, Users tables      │         │
│  │ ├── Write: ActivityLogs table                    │         │
│  │ ├── Publish: SNS task-notifications topic        │         │
│  │ └── NO admin access, NO delete table             │         │
│  └─────────────────────────────────────────────────┘         │
│                                                               │
│  ┌─────────────────────────────────────────────────┐         │
│  │ Lambda Execution Role (streamProcessor)          │         │
│  │ ├── Read: DynamoDB Streams                       │         │
│  │ ├── Read: Boards, Users tables                   │         │
│  │ ├── Publish: SNS topic                           │         │
│  │ └── NO write to application tables               │         │
│  └─────────────────────────────────────────────────┘         │
│                                                               │
│  ┌─────────────────────────────────────────────────┐         │
│  │ Cognito Authenticated Role                       │         │
│  │ ├── Execute AppSync API (Query/Mutation/Sub)     │         │
│  │ ├── Upload to S3 (own prefix only)               │         │
│  │ └── NO direct DynamoDB/Lambda access             │         │
│  └─────────────────────────────────────────────────┘         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Nguyên tắc: Least Privilege (Quyền tối thiểu)**
```
Mỗi service chỉ được cấp ĐÚNG quyền cần thiết, KHÔNG HƠN.

❌ SAI:  "Action": "*", "Resource": "*"    ← Too permissive!
✅ ĐÚNG: "Action": "dynamodb:GetItem",     ← Specific action
         "Resource": "arn:aws:dynamodb:...:table/Tasks"  ← Specific table
```

## 11.2 Authentication (Cognito)

```
FLOW XÁC THỰC:
═══════════════

1. ĐĂNG KÝ:
   User → Cognito Sign Up → Verification Email → Confirm → Account Created

2. ĐĂNG NHẬP:
   User → Cognito Sign In → Return JWT Tokens
                              ├── ID Token (user info)
                              ├── Access Token (API access)
                              └── Refresh Token (renew tokens)

3. API REQUEST:
   Frontend → GraphQL Request + Authorization Header: Bearer <AccessToken>
   AppSync → Verify token with Cognito → If valid → Process request
                                        → If invalid → 401 Unauthorized

4. TOKEN REFRESH:
   Access Token hết hạn (1 giờ) → Amplify SDK tự động dùng Refresh Token
   → Lấy Access Token mới → User không bị đăng xuất
```

### Cognito Configuration
```javascript
// Password policy
{
  MinimumLength: 8,
  RequireLowercase: true,
  RequireNumbers: true,
  RequireSymbols: false,     // Không bắt buộc ký tự đặc biệt (dễ nhớ hơn)
  RequireUppercase: true
}

// Token expiration
{
  AccessTokenValidity: 1,     // 1 giờ
  IdTokenValidity: 1,         // 1 giờ
  RefreshTokenValidity: 30    // 30 ngày
}
```

## 11.3 Authorization (User chỉ thấy board của mình)

### Mô hình Authorization

```
┌───────────────────────────────────────────────────────────┐
│                  AUTHORIZATION MODEL                       │
│                                                            │
│  Level 1: Authentication (Cognito)                        │
│  ├── Có token hợp lệ? → Cho phép gọi API                │
│  └── Không có token → 401 Unauthorized                    │
│                                                            │
│  Level 2: AppSync Authorization Rules (@auth directive)   │
│  ├── @auth(rules: [{ allow: owner }])                     │
│  │   → Chỉ owner mới được CRUD                           │
│  ├── @auth(rules: [{ allow: private }])                   │
│  │   → Bất kỳ user đã đăng nhập                          │
│  └── @auth(rules: [{ allow: groups }])                    │
│      → Theo nhóm (ADMIN, MEMBER)                          │
│                                                            │
│  Level 3: Business Logic (Lambda)                         │
│  ├── Check membership: user có phải member của board?     │
│  ├── Check role: user có quyền thực hiện action?          │
│  └── Check ownership: user có phải owner?                 │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

### Ví dụ Authorization trong Lambda

```javascript
// Kiểm tra quyền truy cập board
async function checkBoardAccess(boardId, userId, requiredRole = 'MEMBER') {
  const board = await dynamodb.get({
    TableName: 'Boards',
    Key: { boardId }
  }).promise();

  if (!board.Item) {
    throw new Error('Board not found');
  }

  const member = board.Item.members.find(m => m.userId === userId);

  if (!member) {
    throw new Error('Access denied: You are not a member of this board');
  }

  // Check role hierarchy: OWNER > ADMIN > MEMBER
  const roleHierarchy = { 'OWNER': 3, 'ADMIN': 2, 'MEMBER': 1 };

  if (roleHierarchy[member.role] < roleHierarchy[requiredRole]) {
    throw new Error(`Access denied: Required role ${requiredRole}, your role: ${member.role}`);
  }

  return member;
}

// Sử dụng
exports.handler = async (event) => {
  const userId = event.identity.sub;
  const { boardId } = event.arguments.input;

  // Chỉ OWNER hoặc ADMIN mới được xóa task
  await checkBoardAccess(boardId, userId, 'ADMIN');

  // ... proceed with delete
};
```

### Truy vấn: User chỉ thấy boards của mình

```javascript
// listMyBoards resolver
exports.handler = async (event) => {
  const userId = event.identity.sub;

  // Lấy danh sách boardIds của user
  const user = await dynamodb.get({
    TableName: 'Users',
    Key: { userId }
  }).promise();

  if (!user.Item || !user.Item.boardIds || user.Item.boardIds.length === 0) {
    return [];
  }

  // Chỉ lấy boards mà user là member
  const boards = await dynamodb.batchGet({
    RequestItems: {
      'Boards': {
        Keys: user.Item.boardIds.map(id => ({ boardId: id }))
      }
    }
  }).promise();

  // Filter thêm lần nữa để chắc chắn
  return boards.Responses.Boards.filter(board =>
    board.members.some(m => m.userId === userId)
  );
};
```

> [!WARNING]
> **S3 Security**: Không để S3 bucket public!
> ```json
> // S3 bucket policy - chỉ cho authenticated users upload
> {
>   "Effect": "Allow",
>   "Action": ["s3:PutObject"],
>   "Resource": "arn:aws:s3:::taskman-uploads/uploads/${cognito-identity.amazonaws.com:sub}/*"
> }
> ```
> User chỉ upload được vào folder có tên = userId của mình.

---

# 12. Demo Scenario

## 12.1 Kịch Bản Demo

```
╔══════════════════════════════════════════════════════════════╗
║                    DEMO SCENARIO                             ║
║                                                              ║
║  Actors:                                                     ║
║  ├── User A (Nguyễn Văn A) - Owner                          ║
║  └── User B (Trần Thị B) - Member                           ║
║                                                              ║
║  Environment:                                                ║
║  ├── Browser 1: Chrome (User A)                              ║
║  └── Browser 2: Firefox / Chrome Incognito (User B)          ║
╚══════════════════════════════════════════════════════════════╝
```

### Scene 1: Tạo và chia sẻ Board (2 phút)

```
[User A - Chrome]
1. Đăng nhập → Dashboard trống
2. Click "Create Board"
   → Nhập tên: "Sprint 1 - Final Project"
   → Chọn màu nền: Xanh dương
3. Board được tạo với 3 columns mặc định:
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │  TO DO   │ │IN PROGRESS│ │   DONE   │
   │          │ │          │ │          │
   │ (empty)  │ │ (empty)  │ │ (empty)  │
   └──────────┘ └──────────┘ └──────────┘

4. Click "Invite Member"
   → Nhập email: userB@university.edu
   → Role: Member
   → ✅ Invitation sent

[User B - Firefox]
5. Nhận email notification: "Bạn được mời vào board 'Sprint 1'"
6. Đăng nhập → Dashboard hiển thị "Sprint 1 - Final Project"
7. Click vào board → Mở board view
```

### Scene 2: Tạo Tasks (2 phút)

```
[User A - Chrome]
1. Click "Add Task" trong column "TO DO"
2. Tạo tasks:
   ├── "Thiết kế database"      (Priority: HIGH)
   ├── "Code backend API"       (Priority: HIGH, Assign: User B)
   └── "Viết unit tests"        (Priority: MEDIUM)

[User B - Firefox] ← REALTIME DEMO
3. User B KHÔNG cần refresh page
4. Các tasks xuất hiện TỰ ĐỘNG trên board của User B! ⚡
   ┌──────────────┐ ┌──────────────┐ ┌──────────┐
   │    TO DO     │ │ IN PROGRESS  │ │   DONE   │
   ├──────────────┤ ├──────────────┤ ├──────────┤
   │┌────────────┐│ │              │ │          │
   ││🔴 Thiết kế ││ │              │ │          │
   ││  database  ││ │              │ │          │
   │└────────────┘│ │              │ │          │
   │┌────────────┐│ │              │ │          │
   ││🔴 Code     ││ │              │ │          │
   ││ backend API││ │              │ │          │
   ││ 👤 User B  ││ │              │ │          │
   │└────────────┘│ │              │ │          │
   │┌────────────┐│ │              │ │          │
   ││🟡 Viết     ││ │              │ │          │
   ││ unit tests ││ │              │ │          │
   │└────────────┘│ │              │ │          │
   └──────────────┘ └──────────────┘ └──────────┘

5. User B nhận notification: "Bạn được giao task 'Code backend API'"
```

### Scene 3: Kéo Thả Task - REALTIME (2 phút) ⭐

```
[User A - Chrome]
1. User A kéo task "Thiết kế database" 
   TỪ "TO DO" ──────► SANG "IN PROGRESS"

[User B - Firefox] ← QUAN SÁT REALTIME
2. Task "Thiết kế database" TỰ ĐỘNG di chuyển
   sang column "IN PROGRESS" trên màn hình User B!

   ┌──────────────┐ ┌──────────────┐ ┌──────────┐
   │    TO DO     │ │ IN PROGRESS  │ │   DONE   │
   ├──────────────┤ ├──────────────┤ ├──────────┤
   │┌────────────┐│ │┌────────────┐│ │          │
   ││🔴 Code     ││ ││🔴 Thiết kế ││ │          │
   ││ backend API││ ││  database  ││ │          │
   ││ 👤 User B  ││ │└────────────┘│ │          │
   │└────────────┘│ │              │ │          │
   │┌────────────┐│ │              │ │          │
   ││🟡 Viết     ││ │              │ │          │
   ││ unit tests ││ │              │ │          │
   │└────────────┘│ │              │ │          │
   └──────────────┘ └──────────────┘ └──────────┘

3. ⚡ Thời gian delay: < 500ms (gần như tức thì!)

[User B - Firefox]
4. User B kéo task "Code backend API"
   TỪ "TO DO" ──────► SANG "IN PROGRESS"

[User A - Chrome] ← QUAN SÁT REALTIME
5. Task "Code backend API" tự di chuyển sang "IN PROGRESS"

[Notification]
6. Cả 2 user nhận notification:
   🔔 "Task 'Thiết kế database' moved to IN PROGRESS by Nguyễn Văn A"
   🔔 "Task 'Code backend API' moved to IN PROGRESS by Trần Thị B"
```

### Scene 4: Update và hoàn thành Task (1 phút)

```
[User B - Firefox]
1. Click vào task "Code backend API"
2. Sửa description: "Implement REST API endpoints using Lambda"
3. Đổi priority: HIGH → URGENT 🔴
4. Kéo task sang "DONE"

[User A - Chrome]
5. Thấy TẤT CẢ thay đổi realtime:
   ├── Description đã update
   ├── Priority đổi thành URGENT
   └── Task di chuyển sang DONE

[Final Board State]
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │    TO DO     │ │ IN PROGRESS  │ │     DONE     │
   ├──────────────┤ ├──────────────┤ ├──────────────┤
   │┌────────────┐│ │┌────────────┐│ │┌────────────┐│
   ││🟡 Viết     ││ ││🔴 Thiết kế ││ ││✅ Code     ││
   ││ unit tests ││ ││  database  ││ ││ backend API││
   │└────────────┘│ │└────────────┘│ ││ 👤 User B  ││
   │              │ │              │ │└────────────┘│
   └──────────────┘ └──────────────┘ └──────────────┘
```

---

# 13. Nội Dung Báo Cáo

## 13.1 Cấu Trúc Báo Cáo Đề Xuất

```
CHƯƠNG 1: GIỚI THIỆU
  1.1 Đặt vấn đề
  1.2 Mục tiêu đề tài
  1.3 Phạm vi đề tài
  1.4 Phương pháp nghiên cứu

CHƯƠNG 2: CƠ SỞ LÝ THUYẾT
  2.1 Cloud Computing và AWS
  2.2 Serverless Architecture
  2.3 Event-Driven Architecture
  2.4 GraphQL và AppSync
  2.5 NoSQL Database (DynamoDB)
  2.6 Realtime Communication (WebSocket)

CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG
  3.1 Phân tích yêu cầu
  3.2 Thiết kế kiến trúc hệ thống
  3.3 Thiết kế cơ sở dữ liệu
  3.4 Thiết kế API (GraphQL Schema)
  3.5 Thiết kế Event-Driven Architecture
  3.6 Thiết kế Notification System

CHƯƠNG 4: TRIỂN KHAI
  4.1 Cấu hình AWS Services
  4.2 Phát triển Backend (Lambda Functions)
  4.3 Phát triển Frontend (React)
  4.4 Kết nối Realtime (AppSync Subscriptions)
  4.5 Testing

CHƯƠNG 5: KẾT QUẢ VÀ ĐÁNH GIÁ
  5.1 Kết quả đạt được
  5.2 Demo hệ thống
  5.3 Phân tích chi phí
  5.4 Đánh giá hiệu năng
  5.5 So sánh với giải pháp truyền thống

CHƯƠNG 6: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN
  6.1 Kết luận
  6.2 Hạn chế
  6.3 Hướng phát triển
```

## 13.2 Nội Dung Chi Tiết Từng Phần

### Chương 1: Giới Thiệu

#### 1.1 Đặt vấn đề
```
Trong môi trường làm việc hiện đại, quản lý công việc nhóm là yêu cầu
thiết yếu. Các công cụ như Trello, Asana, Jira đã chứng minh hiệu quả
của phương pháp Kanban trong quản lý task.

Tuy nhiên, việc xây dựng một hệ thống tương tự đòi hỏi:
- Khả năng cộng tác realtime (nhiều user cùng sử dụng)
- Chi phí vận hành thấp (phù hợp startup, sinh viên)
- Khả năng mở rộng (từ 10 đến hàng nghìn user)
- Bảo mật dữ liệu

Kiến trúc serverless trên AWS cung cấp giải pháp cho tất cả
các yêu cầu trên, với chi phí gần như bằng 0 cho small-scale
deployment.
```

#### 1.2 Mục tiêu đề tài
```
1. Xây dựng hệ thống quản lý task realtime với giao diện kéo thả
2. Áp dụng kiến trúc serverless event-driven trên AWS
3. Tối ưu chi phí vận hành bằng mô hình pay-per-use
4. Đảm bảo khả năng mở rộng tự động
5. Triển khai hệ thống notification realtime
```

### Chương 5: Ưu Điểm Cần Nhấn Mạnh

```
╔══════════════════════════════════════════════════════════════╗
║              ƯU ĐIỂM CỦA HỆ THỐNG                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  1. EVENT-DRIVEN ARCHITECTURE                                ║
║     ├── Loose coupling: Dễ bảo trì, mở rộng                ║
║     ├── Asynchronous: Xử lý nhanh, không blocking           ║
║     ├── Scalable: Thêm consumer dễ dàng                     ║
║     └── Resilient: 1 service fail ≠ system fail              ║
║                                                              ║
║  2. REALTIME CAPABILITY                                      ║
║     ├── WebSocket via AppSync Subscriptions                  ║
║     ├── Latency < 500ms cho realtime updates                 ║
║     ├── Optimistic UI cho trải nghiệm mượt mà               ║
║     └── Conflict resolution tự động                          ║
║                                                              ║
║  3. COST OPTIMIZATION                                        ║
║     ├── $0/tháng cho 10 users (Free Tier)                   ║
║     ├── ~$1/tháng cho 100 users                              ║
║     ├── Pay-per-use: Không traffic = Không tốn tiền         ║
║     ├── Tiết kiệm ~98% so với kiến trúc truyền thống       ║
║     └── Không cần DevOps engineer                            ║
║                                                              ║
║  4. SERVERLESS BENEFITS                                      ║
║     ├── Zero server management                               ║
║     ├── Auto-scaling tự động                                 ║
║     ├── High availability (99.9%+)                           ║
║     ├── Built-in security (IAM, Cognito)                    ║
║     └── Focus on business logic, not infrastructure          ║
║                                                              ║
║  5. DEVELOPER EXPERIENCE                                     ║
║     ├── GraphQL: Flexible, type-safe API                    ║
║     ├── Amplify: CLI tools giúp deploy nhanh                ║
║     ├── Generated code: Auto-gen queries/mutations           ║
║     └── Local testing: Amplify mock                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Kết Luận (Mẫu)

```
Đề tài "Realtime Task Management System using AWS Serverless Architecture"
đã được triển khai thành công với các kết quả:

1. Hệ thống hoạt động realtime với latency < 500ms
2. Chi phí vận hành $0-1/tháng, tiết kiệm ~98% so với truyền thống
3. Tự động scale từ 10 đến hàng nghìn user
4. Event-driven architecture đảm bảo loose coupling và dễ mở rộng
5. Bảo mật với authentication (Cognito) và authorization (IAM + AppSync)

Hướng phát triển:
- Tích hợp AI để gợi ý task (Amazon Bedrock)
- Mobile app (React Native + Amplify)
- Video call tích hợp (Amazon Chime)
- Analytics dashboard (Amazon QuickSight)
- CI/CD pipeline hoàn chỉnh (AWS CodePipeline)
```
