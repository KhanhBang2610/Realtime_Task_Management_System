import { jest } from '@jest/globals';

// 1. Giả lập (Mock) các gói AWS SDK để không kết nối thật lên cloud khi chạy test
jest.unstable_mockModule('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: jest.fn()
}));

jest.unstable_mockModule('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: jest.fn(() => ({
            // Giả lập hàm send luôn trả về kết quả thành công mà không cần gọi vào DB thật
            send: jest.fn().mockResolvedValue({ 
                $metadata: { httpStatusCode: 200 },
                Item: { id: 'p1', name: 'Project Realtime' } 
            })
        }))
    },
    GetCommand: jest.fn(),
    PutCommand: jest.fn(),
    DeleteCommand: jest.fn(),
    UpdateCommand: jest.fn(),
    QueryCommand: jest.fn(), 
    ScanCommand: jest.fn()  
}));

// 2. Sau khi đã cấu hình Mock xong xuôi, tiến hành import handler bằng dynamic import (bắt buộc với ESM)
const { handler } = await import('../functions/userManager/index.mjs');

describe('User Manager API Lambda Handler', () => {
    const mockAdmin = { id: 'u1', role: 'admin', projectIds: ['p1'] };
    const mockMember = { id: 'u2', role: 'member', projectIds: ['p1'] };
    const mockNonMember = { id: 'u3', role: 'member', projectIds: ['p99'] }; // Không thuộc project p1

    const createMockEvent = (method, user, projectId = 'p1', body = null) => ({
        httpMethod: method,
        pathParameters: { id: projectId },
        requestContext: {
            authorizer: {
                user: JSON.stringify(user)
            }
        },
        body: body ? JSON.stringify(body) : null 
    });

    it('1. Trả về 403 nếu Non-member cố gọi API GET', async () => {
        const event = createMockEvent('GET', mockNonMember);
        const response = await handler(event);
        expect(response.statusCode).toBe(403);
    });

    it('2. Trả về 200 nếu Member gọi API GET (Xem danh sách)', async () => {
        const event = createMockEvent('GET', mockMember);
        const response = await handler(event);
        expect(response.statusCode).toBe(200);
    });

    it('3. Trả về 403 nếu Member cố gọi API POST (Mời thành viên)', async () => {
        const event = createMockEvent('POST', mockMember);
        const response = await handler(event);
        expect(response.statusCode).toBe(403);
    });

    it('4. Trả về 201 hoặc 200 nếu Admin gọi API POST (Mời thành viên)', async () => {
        const mockBody = { email: "newmember@gmail.com", role: "member" };
        const event = createMockEvent('POST', mockAdmin, 'p1', mockBody);
        
        const response = await handler(event);
        expect([200, 201]).toContain(response.statusCode); 
    });
});