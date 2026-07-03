import { canUserPerform } from '../utils/permissions.mjs';

describe('Role-Based Access Control - canUserPerform', () => {
    const adminUser = { id: 'u1', role: 'admin' };
    const memberUser = { id: 'u2', role: 'member' };
    const nonMemberUser = { id: 'u3', role: 'guest' }; // Hoặc không có role

    const myTask = { id: 'task1', ownerId: 'u2' };
    const otherTask = { id: 'task2', ownerId: 'u99' };

    describe('1. Admin Role', () => {
        it('Admin có thể làm mọi thứ (tạo, xóa, sửa, xem member, ...)', () => {
            expect(canUserPerform(adminUser, 'create:tasks')).toBe(true);
            expect(canUserPerform(adminUser, 'delete:tasks', otherTask)).toBe(true);
            expect(canUserPerform(adminUser, 'read:members')).toBe(true);
            expect(canUserPerform(adminUser, 'invite:members')).toBe(true);
        });
    });

    describe('2. Member Role', () => {
        it('Member có thể tạo và xem task', () => {
            expect(canUserPerform(memberUser, 'create:tasks')).toBe(true);
            expect(canUserPerform(memberUser, 'read:tasks')).toBe(true);
        });

        it('Member CHỈ ĐƯỢC xóa/sửa task của chính mình', () => {
            expect(canUserPerform(memberUser, 'delete:tasks', myTask)).toBe(true);
            expect(canUserPerform(memberUser, 'update:tasks', myTask)).toBe(true);
        });

        it('Member KHÔNG ĐƯỢC xóa/sửa task của người khác (Trả về 403)', () => {
            expect(canUserPerform(memberUser, 'delete:tasks', otherTask)).toBe(false);
            expect(canUserPerform(memberUser, 'update:tasks', otherTask)).toBe(false);
        });

        it('Member KHÔNG ĐƯỢC mời hay xóa thành viên khác', () => {
            expect(canUserPerform(memberUser, 'invite:members')).toBe(false);
            expect(canUserPerform(memberUser, 'delete:members')).toBe(false);
        });
    });

    describe('3. Non-member Role', () => {
        it('Non-member bị từ chối mọi thao tác (Trả về 403)', () => {
            expect(canUserPerform(nonMemberUser, 'read:tasks')).toBe(false);
            expect(canUserPerform(null, 'read:tasks')).toBe(false);
        });
    });

    describe('4. Performance Test', () => {
        it('Permission check chạy dưới 10ms', () => {
            const start = performance.now();
            
            // Chạy thử 100 lần check liên tục để đo tốc độ
            for(let i = 0; i < 100; i++) {
                canUserPerform(memberUser, 'delete:tasks', myTask);
            }
            
            const end = performance.now();
            const executionTime = end - start;
            
            console.log(`Thời gian chạy 100 lần check: ${executionTime.toFixed(4)} ms`);
            expect(executionTime).toBeLessThan(10); // Đảm bảo tổng thời gian < 10ms
        });
    });
});