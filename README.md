# 📋 Realtime Task Management System
## AWS Serverless Architecture - Project Documentation

---

## 🎯 Tổng Quan Project

Hệ thống quản lý công việc realtime, xây dựng hoàn toàn trên **AWS Serverless Architecture**.

### Tech Stack

| Layer | Technology | AWS Service |
|-------|-----------|-------------|
| Frontend | React.js + AWS Amplify | S3 + CloudFront |
| API | GraphQL | Amazon AppSync |
| Auth | JWT + OAuth | Amazon Cognito |
| Business Logic | Node.js | AWS Lambda |
| Database | NoSQL | Amazon DynamoDB |
| Realtime | WebSocket | AppSync Subscriptions |
| Notification | Pub/Sub | Amazon SNS |
| Storage | Object Storage | Amazon S3 |

### Chi phí

| Scale | Chi phí/tháng |
|-------|--------------|
| 10 users (demo) | **$0** (Free Tier) |
| 100 users | **~$1** (~24,000 VNĐ) |
| Truyền thống tương đương | ~$52/tháng |

---

## 📚 Tài Liệu

| # | File | Nội dung |
|---|------|----------|
| 1 | [01-system-analysis.md](./01-system-analysis.md) | Phân tích bài toán, chức năng, user stories |
| 2 | [02-system-architecture.md](./02-system-architecture.md) | Thiết kế kiến trúc AWS, sơ đồ, data flow |
| 3 | [03-database-design.md](./03-database-design.md) | DynamoDB tables, keys, query optimization |
| 4 | [04-api-design.md](./04-api-design.md) | GraphQL schema, queries, mutations, subscriptions |
| 5 | [05-event-driven-architecture.md](./05-event-driven-architecture.md) | Events, flows, stream processor, decoupling |
| 6 | [06-notification-and-frontend.md](./06-notification-and-frontend.md) | SNS notifications + React components |
| 7 | [08-deployment-guide.md](./08-deployment-guide.md) | Hướng dẫn triển khai AWS từng bước |
| 8 | [09-cost-optimization.md](./09-cost-optimization.md) | Phân tích chi phí, tối ưu, ước tính |
| 9 | [10-13-scaling-security-demo-report.md](./10-13-scaling-security-demo-report.md) | Scaling, security, demo, báo cáo |

---

## 🏗️ Kiến Trúc Tổng Quan

```
User → CloudFront → AppSync (GraphQL) → Lambda → DynamoDB
                        ↕ WebSocket              ↓ Streams
                    Subscriptions             Lambda → SNS → Email
                    (Realtime)               (Event Processing)
```

## 🚀 Quick Start

```bash
# 1. Clone project
git clone <repo-url>
cd task-manager-frontend

# 2. Install dependencies
npm install

# 3. Initialize Amplify
amplify init

# 4. Add services
amplify add auth      # Cognito
amplify add api       # AppSync + DynamoDB
amplify add function  # Lambda

# 5. Deploy to AWS
amplify push

# 6. Run locally
npm start
```

---

*Project by: [Tên sinh viên] - [Trường/Khoa] - 2026*
