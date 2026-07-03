export default {
  // Báo cho Jest biết môi trường chạy là Node.js (phù hợp cho backend)
  testEnvironment: 'node',
  
  // Chỉ định đường dẫn tìm file test
  testMatch: ['**/backend/tests/**/*.test.mjs'],
  
  // Hỗ trợ nhận diện các đuôi file này
  moduleFileExtensions: ['js', 'mjs', 'json', 'node'],
  
  // Tắt transform vì Node.js phiên bản mới có thể đọc trực tiếp .mjs
  transform: {},
};