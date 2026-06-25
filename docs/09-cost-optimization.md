# Phần 9: Tối Ưu Chi Phí (QUAN TRỌNG)

## 9.1 Phân Tích Chi Phí Từng Service

> [!IMPORTANT]
> **AWS Free Tier (12 tháng đầu)** cung cấp rất nhiều tài nguyên miễn phí.
> Với project sinh viên (10-100 users), bạn CÓ THỂ chạy MIỄN PHÍ trong 12 tháng đầu!

### Region: ap-southeast-1 (Singapore)

---

### 📊 Amazon DynamoDB

```
╔═══════════════════════════════════════════════════════════════════╗
║                    DynamoDB PRICING                               ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  FREE TIER (luôn miễn phí, không giới hạn 12 tháng):            ║
║  ├── 25 GB storage                                               ║
║  ├── 25 WCU (Write Capacity Units) provisioned                   ║
║  ├── 25 RCU (Read Capacity Units) provisioned                    ║
║  └── 2.5 triệu Stream read requests / tháng                     ║
║                                                                   ║
║  ON-DEMAND MODE:                                                  ║
║  ├── Write: $1.4218 / 1 triệu WRU                               ║
║  ├── Read:  $0.2844 / 1 triệu RRU                               ║
║  └── Storage: $0.28495 / GB / tháng                              ║
║                                                                   ║
║  PROVISIONED MODE:                                                ║
║  ├── Write: $0.00074 / WCU / giờ                                 ║
║  ├── Read:  $0.000148 / RCU / giờ                                ║
║  └── Storage: $0.28495 / GB / tháng                              ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

**Khuyến nghị**: Dùng **On-Demand** mode vì:
- ✅ Không cần dự đoán traffic
- ✅ Tự động scale
- ✅ Chỉ trả tiền khi có request thực sự
- ✅ Phù hợp sinh viên (traffic thấp + không ổn định)

---

### 🔷 Amazon AppSync

```
╔═══════════════════════════════════════════════════════════════════╗
║                    AppSync PRICING                                ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  FREE TIER (12 tháng đầu):                                      ║
║  ├── 250,000 query/mutation requests / tháng                     ║
║  ├── 250,000 realtime updates / tháng                            ║
║  ├── 600,000 connection minutes / tháng                          ║
║  └── (= ~833 giờ kết nối = ~34 ngày liên tục 24/7)             ║
║                                                                   ║
║  SAU FREE TIER:                                                   ║
║  ├── Query/Mutation: $4.00 / 1 triệu requests                   ║
║  ├── Realtime updates: $2.00 / 1 triệu updates                  ║
║  └── Connection: $0.08 / 1 triệu connection minutes             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 🔵 AWS Lambda

```
╔═══════════════════════════════════════════════════════════════════╗
║                    Lambda PRICING                                 ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  FREE TIER (luôn miễn phí):                                     ║
║  ├── 1 triệu requests / tháng                                   ║
║  └── 400,000 GB-seconds compute / tháng                          ║
║      (= ~111 giờ với 1GB RAM)                                    ║
║                                                                   ║
║  SAU FREE TIER:                                                   ║
║  ├── $0.20 / 1 triệu requests                                   ║
║  └── $0.0000166667 / GB-second                                   ║
║                                                                   ║
║  VÍ DỤ: Lambda 256MB RAM, chạy 200ms mỗi lần:                   ║
║  → 1 invocation = 0.256 × 0.2 = 0.0512 GB-second                ║
║  → Free tier covers: 400,000 / 0.0512 = ~7.8 triệu invocations  ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 🟠 Amazon SNS

```
╔═══════════════════════════════════════════════════════════════════╗
║                    SNS PRICING                                    ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  FREE TIER (luôn miễn phí):                                     ║
║  ├── 1 triệu publishes / tháng                                  ║
║  ├── 100,000 HTTP deliveries                                     ║
║  └── 1,000 email deliveries                                      ║
║                                                                   ║
║  SAU FREE TIER:                                                   ║
║  ├── $0.50 / 1 triệu publishes                                  ║
║  ├── $0.06 / 100,000 HTTP deliveries                             ║
║  └── $2.00 / 100,000 email deliveries                            ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 🟢 Amazon Cognito

```
╔═══════════════════════════════════════════════════════════════════╗
║                    Cognito PRICING                                ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  FREE TIER (luôn miễn phí):                                     ║
║  └── 50,000 MAU (Monthly Active Users)                           ║
║                                                                   ║
║  → Với 10-100 user, HOÀN TOÀN MIỄN PHÍ                          ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 📦 Amazon S3

```
╔═══════════════════════════════════════════════════════════════════╗
║                    S3 PRICING                                     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  FREE TIER (12 tháng đầu):                                      ║
║  ├── 5 GB storage                                                ║
║  ├── 20,000 GET requests                                         ║
║  └── 2,000 PUT requests                                          ║
║                                                                   ║
║  SAU FREE TIER:                                                   ║
║  ├── Storage: $0.025 / GB / tháng                                ║
║  └── Requests: $0.005 / 1,000 PUT                                ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 9.2 Ước Tính Chi Phí

### Scenario 1: 10 Users (Sinh viên demo project)

```
Giả định:
- 10 users hoạt động
- Mỗi user: 20 requests/ngày
- 5 boards, mỗi board 15 tasks
- 1 giờ sử dụng/ngày (10 user × 1h = 10h connection)
- Trong 12 tháng đầu Free Tier

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Service    │ Usage/tháng        │ Free Tier    │ Chi phí  │
├────────────┼────────────────────┼──────────────┼──────────┤
│ Cognito    │ 10 MAU             │ 50,000 MAU   │ $0.00    │
│ AppSync    │ 6,000 requests     │ 250,000      │ $0.00    │
│            │ 3,000 updates      │ 250,000      │ $0.00    │
│            │ 18,000 conn-min    │ 600,000      │ $0.00    │
│ DynamoDB   │ ~2,000 writes      │ 25 WCU       │ $0.00    │
│            │ ~5,000 reads       │ 25 RCU       │ $0.00    │
│            │ < 1 GB storage     │ 25 GB        │ $0.00    │
│ Lambda     │ ~6,000 invocations │ 1,000,000    │ $0.00    │
│ SNS        │ ~1,000 publishes   │ 1,000,000    │ $0.00    │
│ S3         │ < 1 GB             │ 5 GB         │ $0.00    │
├────────────┼────────────────────┼──────────────┼──────────┤
│ TỔNG       │                    │              │ $0.00    │
│ /tháng     │                    │              │ 🎉       │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 MIỄN PHÍ HOÀN TOÀN trong 12 tháng đầu!
   (Và Cognito + Lambda + SNS + DynamoDB Free Tier là VĨNH VIỄN)
```

### Scenario 2: 100 Users (Scale nhẹ, sau Free Tier)

```
Giả định:
- 100 users hoạt động
- Mỗi user: 50 requests/ngày
- 50 boards, 500 tasks tổng
- 2 giờ sử dụng/ngày trung bình
- SAU 12 tháng (hết AppSync + S3 Free Tier)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Service    │ Usage/tháng            │ Chi phí ước tính     │
├────────────┼────────────────────────┼──────────────────────┤
│ Cognito    │ 100 MAU                │ $0.00 (free < 50K)   │
│ AppSync    │ 150,000 requests       │ $0.60                │
│            │ 50,000 updates         │ $0.10                │
│            │ 360,000 conn-min       │ $0.03                │
│ DynamoDB   │ 50,000 writes (on-dem) │ $0.07                │
│            │ 150,000 reads          │ $0.04                │
│            │ ~2 GB storage          │ $0.00 (free 25GB)    │
│ Lambda     │ 200,000 invocations    │ $0.00 (free 1M)     │
│            │ 10,000 GB-sec          │ $0.00 (free 400K)   │
│ SNS        │ 30,000 publishes       │ $0.00 (free 1M)     │
│            │ 3,000 emails           │ $0.04                │
│ S3         │ 5 GB                   │ $0.13                │
│ CloudFront │ 10 GB transfer         │ $0.00 (free 1TB/y)  │
├────────────┼────────────────────────┼──────────────────────┤
│ TỔNG       │                        │ ~$1.01 / tháng       │
│ /tháng     │                        │ (~24,000 VNĐ)        │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Chỉ khoảng ~$1/tháng cho 100 users!
```

### So sánh với kiến trúc truyền thống

```
KIẾN TRÚC TRUYỀN THỐNG (EC2 + RDS):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Service              │ Chi phí / tháng │
├──────────────────────┼─────────────────┤
│ EC2 t3.micro         │ $8.50           │
│ RDS t3.micro         │ $15.00          │
│ ElastiCache (Redis)  │ $12.00          │
│ ALB                  │ $16.20          │
├──────────────────────┼─────────────────┤
│ TỔNG                 │ ~$51.70/tháng   │
│                      │ (~1.2M VNĐ)     │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KIẾN TRÚC SERVERLESS (Project này):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Service              │ Chi phí / tháng │
├──────────────────────┼─────────────────┤
│ Tất cả services      │ $0 - $1.01      │
├──────────────────────┼─────────────────┤
│ TỔNG                 │ ~$0-1/tháng     │
│                      │ (0 - 24K VNĐ)   │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TIẾT KIỆM: ~$50/tháng = ~1.2 triệu VNĐ/tháng
          = ~98% cheaper! 🎉
```

## 9.3 Đề Xuất Tối Ưu Chi Phí

### 🏆 Top 5 Tips Giảm Chi Phí

```
1️⃣ SỬ DỤNG FREE TIER TỐI ĐA
   ├── Cognito: MIỄN PHÍ cho < 50,000 MAU (vĩnh viễn)
   ├── Lambda: 1M requests/tháng miễn phí (vĩnh viễn)
   ├── DynamoDB: 25GB + 25WCU/25RCU miễn phí (vĩnh viễn)
   ├── SNS: 1M publishes miễn phí (vĩnh viễn)
   └── AppSync: 250K requests miễn phí (12 tháng)

2️⃣ DÙNG DIRECT DYNAMODB RESOLVERS thay vì Lambda khi có thể
   ├── Direct resolver: $0 (chỉ tính DynamoDB read/write)
   ├── Lambda resolver: $0.20/1M invocations + compute time
   └── Ước tính tiết kiệm: ~40% Lambda costs

3️⃣ DYNAMODB ON-DEMAND MODE cho dev/staging
   ├── Không tốn tiền khi không có traffic
   ├── Tự động scale
   └── Chuyển sang Provisioned khi traffic ổn định

4️⃣ TTL cho data tạm thời
   ├── ActivityLogs: TTL = 30 ngày → Tự động xóa
   ├── Notifications: TTL = 7 ngày → Tự động xóa
   └── Giảm storage costs + DynamoDB read costs

5️⃣ OPTIMIZE LAMBDA
   ├── Dùng 256MB RAM (đủ cho business logic đơn giản)
   ├── Keep functions small → Reduce execution time
   ├── Reuse connections (SDK client outside handler)
   └── Bundle code nhỏ gọn → Reduce cold start
```

### Lambda Optimization Example

```javascript
// ❌ KHÔNG TỐI ƯU: Tạo client MỖI LẦN gọi function
exports.handler = async (event) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient(); // Tạo mới mỗi lần!
  const result = await dynamodb.get({...}).promise();
  return result;
};

// ✅ TỐI ƯU: Tạo client NGOÀI handler (reuse giữa các invocations)
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient(); // Tạo 1 lần, reuse!

exports.handler = async (event) => {
  const result = await dynamodb.get({...}).promise();
  return result;
};
// → Giảm ~100ms cho mỗi warm invocation
// → Ít execution time = ít tiền!
```

> [!TIP]
> **Billing Alert**: Luôn set up AWS Budget Alert!
> ```
> AWS Console → Billing → Budgets → Create budget
> → Monthly budget: $5
> → Alert threshold: 80% ($4)
> → Email: your-email@university.edu
> ```
> Bạn sẽ nhận email cảnh báo khi chi phí gần đến ngưỡng.
