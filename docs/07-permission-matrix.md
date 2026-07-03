# 07 - Role-Based Access Control (RBAC) & Permission Matrix

Tài liệu này định nghĩa ma trận phân quyền cho hệ thống quản lý dự án và nhiệm vụ. Các quyền được chia theo 3 cấp độ (Role) chính: `Admin`, `Member`, và `Non-member`.

## 1. Permission Matrix (Ma trận phân quyền)

| Thao tác (Action) / Resource | Admin | Member | Non-member | Ghi chú / HTTP Status khi từ chối |
| :--- | :---: | :---: | :---: | :--- |
| **Tasks (Nhiệm vụ)** | | | | |
| Xem danh sách Tasks | ✅ | ✅ | ❌ | Non-member trả về `403 Forbidden` |
| Tạo Task mới | ✅ | ✅ | ❌ | |
| Cập nhật Task của mình | ✅ | ✅ | ❌ | |
| Xóa Task của mình | ✅ | ✅ | ❌ | |
| Xóa Task của **người khác** | ✅ | ❌ | ❌ | Member xóa task người khác trả về `403 Forbidden` |
| **Project Members (Thành viên)** | | | | |
| Xem danh sách Members (`GET`) | ✅ | ✅ | ❌ | Non-member không được xem |
| Mời Member mới (`POST`) | ✅ | ❌ | ❌ | Chỉ Admin |
| Xóa Member (`DELETE`) | ✅ | ❌ | ❌ | Chỉ Admin |
| Thay đổi Role (`PATCH`) | ✅ | ❌ | ❌ | Chỉ Admin |

## 2. Logic kiểm tra (Quy tắc xử lý)

* **Thời gian phản hồi:** Mọi thao tác Permission check phải được tối ưu, không làm chậm response quá `10ms`.
* **Flow kiểm tra chung (Middleware / Helper):**
  1. Xác thực người dùng đã đăng nhập chưa (Authentication).
  2. Dùng `checkProjectMembership` để xác định user có nằm trong Project này không. Nếu không -> `Non-member` (Return 403 cho các route cần quyền).
  3. Lấy Role của user trong Project.
  4. Dùng `canUserPerform(user, action, resource)` đối chiếu với ma trận trên để cho phép (Next) hoặc chặn (Return 403).