// Định nghĩa danh sách quyền hạn cho từng Role (Ma trận phân quyền bằng code)
const ROLE_PERMISSIONS = {
    admin: ['*'], // Admin có toàn quyền (tất cả các action)
    member: [
        'read:tasks',
        'create:tasks',
        'update:tasks',
        'delete:tasks', // Sẽ được kiểm tra thêm điều kiện chủ sở hữu ở logic bên dưới
        'read:members'
    ]
    // Non-member không có trong này nên mặc định sẽ bị từ chối
};

/**
 * Hàm kiểm tra quyền của user đối với một hành động cụ thể
 * @param {Object} user - Đối tượng user (vd: { id: 'u1', role: 'member' })
 * @param {String} action - Hành động muốn thực hiện (vd: 'delete:tasks', 'invite:members')
 * @param {Object} resource - Dữ liệu đang thao tác (vd: { id: 't1', ownerId: 'u2' })
 * @returns {Boolean} - true nếu được phép, false nếu bị cấm
 */
export const canUserPerform = (user, action, resource = null) => {
    // 1. Nếu không có user hoặc không có role -> Cấm (Non-member)
    if (!user || !user.role) return false;

    // 2. Admin luôn có toàn quyền trong project
    if (user.role === 'admin') return true;

    // 3. Xử lý logic cho Member
    if (user.role === 'member') {
        // Kiểm tra xem hành động này có nằm trong danh sách quyền của member không
        const hasActionPermission = ROLE_PERMISSIONS.member.includes(action);
        
        if (!hasActionPermission) return false;

        // Xử lý Edge Case: Member XÓA task (Chỉ được xóa task của chính mình)
        if (action === 'delete:tasks' && resource) {
            // So sánh ID của user hiện tại với ID của người tạo ra task
            return resource.ownerId === user.id; 
        }

        // Xử lý Edge Case: Member SỬA task (Chỉ được sửa task của chính mình)
        if (action === 'update:tasks' && resource) {
            return resource.ownerId === user.id;
        }

        return true;
    }

    return false;
};