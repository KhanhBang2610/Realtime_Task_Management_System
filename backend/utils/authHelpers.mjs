/**
 * Thay thế cho middleware checkProjectMembership
 * Kiểm tra xem user có phải là thành viên của project hay không
 */
export const checkProjectMembership = (user, projectId) => {
    if (!user || !user.projectIds) return false;
    
    // Kiểm tra xem ID của project có nằm trong danh sách project của user không
    return user.projectIds.includes(projectId);
};

/**
 * Thay thế cho middleware requireRole (Factory pattern)
 * Trả về một hàm dùng để kiểm tra xem role của user có nằm trong danh sách cho phép không
 */
export const requireRole = (allowedRoles) => {
    return (user) => {
        if (!user || !user.role) return false;
        return allowedRoles.includes(user.role);
    };
};