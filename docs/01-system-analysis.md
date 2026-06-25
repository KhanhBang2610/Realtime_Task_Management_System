# Phần 1: Phân Tích Bài Toán - Realtime Task Management System

## 1.1 Mô Tả Hệ Thống

**Realtime Task Management System** là một ứng dụng quản lý công việc theo phong cách Trello, cho phép nhiều người dùng cộng tác **realtime** trên cùng một board. Hệ thống được xây dựng hoàn toàn trên **AWS Serverless Architecture**, đảm bảo:

- **Scalable**: Tự động mở rộng khi số lượng user tăng
- **Cost-optimized**: Chỉ trả tiền khi có người dùng thực sự sử dụng (pay-per-use)
- **Event-driven**: Mọi hành động đều tạo ra event, giúp hệ thống loosely coupled

### Tổng quan hoạt động

```
┌─────────────────────────────────────────────────────────────┐
│                    TASK MANAGEMENT SYSTEM                     │
│                                                               │
│  User A ──┐                                    ┌── User B    │
│            │         ┌───────────┐             │              │
│            ├────────►│   Board   │◄────────────┤              │
│            │         │ ┌───┬───┐ │             │              │
│            │         │ │To │In │ │  Realtime   │              │
│            │         │ │Do │Pro│ │  Sync ⚡    │              │
│            │         │ │   │   │ │             │              │
│            │         │ └───┴───┘ │             │              │
│            │         └───────────┘             │              │
│  User C ──┘                                    └── User D    │
└─────────────────────────────────────────────────────────────┘
```

## 1.2 Các Chức Năng Chính

### 🔐 1. User Authentication (Đăng ký / Đăng nhập)

| Chức năng | Mô tả | Service AWS |
|-----------|--------|-------------|
| Đăng ký | User tạo tài khoản bằng email/password | Amazon Cognito |
| Đăng nhập | Xác thực và nhận JWT token | Amazon Cognito |
| Quên mật khẩu | Reset password qua email | Amazon Cognito |
| Social Login | Đăng nhập bằng Google/Facebook (optional) | Cognito Identity Provider |

**Ví dụ flow đăng nhập:**
```
User nhập email + password
    → Cognito xác thực
    → Trả về JWT Token (Access Token + ID Token + Refresh Token)
    → Frontend lưu token
    → Mọi request sau đó gửi kèm token
```

### 📋 2. Board Management (Quản lý Board)

| Chức năng | Mô tả |
|-----------|--------|
| Tạo board | User tạo board mới với tên + mô tả |
| Xem danh sách board | Liệt kê tất cả board user tham gia |
| Mời thành viên | Thêm user khác vào board |
| Xóa board | Chỉ owner mới được xóa |
| Cập nhật board | Đổi tên, mô tả, background |

**Ví dụ**: User A tạo board "Sprint 1" → Mời User B, C → Cả 3 cùng thấy board

### ✅ 3. Task Management (Quản lý Task)

| Chức năng | Mô tả |
|-----------|--------|
| Tạo task | Tạo task mới trong một column (To Do, In Progress, Done) |
| Sửa task | Cập nhật title, description, assignee, due date |
| Kéo thả task | Di chuyển task giữa các column (drag & drop) |
| Xóa task | Xóa task khỏi board |
| Gán task | Assign task cho member cụ thể |
| Comment | Bình luận trên task (optional) |

**Ví dụ kéo thả:**
```
Board: "Sprint 1"
┌──────────┐    ┌──────────┐    ┌──────────┐
│  TO DO   │    │IN PROGRESS│   │   DONE   │
├──────────┤    ├──────────┤    ├──────────┤
│ Task A   │───►│ Task A   │───►│ Task A   │
│ Task B   │    │          │    │          │
│ Task C   │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘

User kéo "Task A" từ "TO DO" sang "IN PROGRESS"
→ Tất cả user khác thấy thay đổi NGAY LẬP TỨC
```

### ⚡ 4. Realtime Update (Cập nhật realtime)

Đây là **tính năng cốt lõi** của hệ thống:

| Scenario | Mô tả |
|----------|--------|
| Nhiều user cùng mở board | Mọi thay đổi đồng bộ realtime |
| Task được tạo mới | Hiển thị ngay trên board của tất cả member |
| Task bị kéo thả | Vị trí mới cập nhật ngay lập tức |
| Task được sửa | Nội dung mới hiển thị realtime |

**Cách hoạt động:**
```
User A kéo task         AppSync nhận mutation
    │                        │
    ▼                        ▼
Frontend gửi request  →  Xử lý & lưu DynamoDB
                              │
                              ▼
                        Trigger Subscription
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                 User B    User C    User D
              (nhận update realtime qua WebSocket)
```

### 🔔 5. Notification System (Hệ thống thông báo)

| Loại thông báo | Trigger | Người nhận |
|----------------|---------|------------|
| Task assigned | Khi bị assign task mới | User được assign |
| Task moved | Khi task chuyển column | Tất cả member của board |
| Task updated | Khi task bị sửa | Assignee + board members |
| Board invitation | Khi được mời vào board | User được mời |

## 1.3 User Stories

### Với vai trò User thường:
1. **Tôi muốn** đăng ký tài khoản **để** sử dụng hệ thống
2. **Tôi muốn** tạo board **để** quản lý công việc
3. **Tôi muốn** tạo task **để** theo dõi tiến độ
4. **Tôi muốn** kéo thả task **để** cập nhật trạng thái nhanh chóng
5. **Tôi muốn** nhận notification **để** biết khi có thay đổi

### Với vai trò Board Owner:
1. **Tôi muốn** mời thành viên **để** cộng tác
2. **Tôi muốn** quản lý quyền **để** kiểm soát ai được làm gì
3. **Tôi muốn** xóa board **để** dọn dẹp workspace

## 1.4 Non-functional Requirements

| Yêu cầu | Mục tiêu | Cách đạt được |
|----------|-----------|---------------|
| **Performance** | Latency < 200ms cho API call | AppSync + DynamoDB (single-digit ms) |
| **Scalability** | Hỗ trợ 10 → 10,000 user | Serverless auto-scaling |
| **Availability** | 99.9% uptime | AWS managed services |
| **Security** | Bảo mật dữ liệu | Cognito + IAM + AppSync authorization |
| **Cost** | Tối thiểu chi phí | Free tier + pay-per-use |
| **Realtime** | Update < 500ms | AppSync Subscriptions (WebSocket) |

## 1.5 Tech Stack Tổng Quan

```
┌─────────────────────────────────────────┐
│              FRONTEND                    │
│  React.js + AWS Amplify + Apollo Client │
└─────────────┬───────────────────────────┘
              │ GraphQL (HTTPS + WebSocket)
              ▼
┌─────────────────────────────────────────┐
│              API LAYER                   │
│         Amazon AppSync (GraphQL)        │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│Cognito │ │Lambda  │ │DynamoDB│
│(Auth)  │ │(Logic) │ │(Data)  │
└────────┘ └───┬────┘ └────────┘
               │
               ▼
          ┌────────┐
          │  SNS   │
          │(Notify)│
          └────────┘
```

> [!TIP]
> **Tại sao chọn Serverless?**
> - Sinh viên không cần quản lý server
> - Không tốn chi phí khi không có traffic
> - AWS Free Tier cho phép dùng miễn phí 12 tháng đầu
> - Tự động scale, không cần lo về infrastructure
