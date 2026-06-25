import { generateClient } from 'aws-amplify/api';
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import * as mutations from '../graphql/mutations';
import * as queries from '../graphql/queries';
import * as subscriptions from '../graphql/subscriptions';

const client = generateClient();

export const authApi = {
  signIn: async (email, password) => {
    try {
      try { await signOut(); } catch (e) { /* ignore */ }
      const { isSignedIn, nextStep } = await signIn({ username: email, password });
      
      if (!isSignedIn) {
        if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
          throw new Error('Tài khoản chưa được xác thực. Vui lòng kiểm tra email hoặc xác nhận trên AWS Cognito.');
        }
        throw new Error('Đăng nhập thất bại.');
      }
      
      const profileRes = await client.graphql({ query: queries.getMyProfile });
      let user = profileRes.data.getMyProfile;
      
      // If profile doesn't exist (because they confirmed via email after signUp threw), create it now
      if (!user) {
        const createRes = await client.graphql({
          query: mutations.createUserProfile,
          variables: { email, displayName: email.split('@')[0] }
        });
        user = createRes.data.createUserProfile;
      }
      
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Login error:', error);
      const msg = error.errors?.[0]?.message || error.message || 'Lỗi không xác định';
      throw new Error(msg);
    }
  },
  signUp: async (email, password, name) => {
    try {
      try { await signOut(); } catch (e) { /* ignore */ }
      await signUp({
        username: email,
        password,
        options: { userAttributes: { email, name } }
      });
      
      const { isSignedIn, nextStep } = await signIn({ username: email, password });
      
      if (!isSignedIn) {
         if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
           throw new Error('Đăng ký thành công! Nhưng tài khoản chưa được xác thực (Unconfirmed). Vui lòng vào AWS Cognito -> Chọn tài khoản -> Actions -> Confirm user.');
         }
         throw new Error('Không thể đăng nhập sau khi đăng ký.');
      }

      const profileRes = await client.graphql({
        query: mutations.createUserProfile,
        variables: { email, displayName: name }
      });
      const user = profileRes.data.createUserProfile;
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },
  signOut: async () => {
    await signOut();
    localStorage.removeItem('user');
  },
  getCurrentUser: async () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

export const boardApi = {
  getBoards: async () => {
    const res = await client.graphql({ query: queries.listMyBoards });
    return res.data.listMyBoards || [];
  },
  listMyBoards: async () => {
    const res = await client.graphql({ query: queries.listMyBoards });
    return res.data.listMyBoards || [];
  },
  getBoard: async (boardId) => {
    const res = await client.graphql({
      query: queries.getBoard,
      variables: { boardId }
    });
    return res.data.getBoard;
  },
  createBoard: async (inputOrName, description, backgroundColor) => {
    let input;
    if (typeof inputOrName === 'object') {
      input = inputOrName;
    } else {
      input = { name: inputOrName, description, backgroundColor };
    }
    const res = await client.graphql({
      query: mutations.createBoard,
      variables: { input }
    });
    return res.data.createBoard;
  },
  deleteBoard: async (boardId) => {
    const res = await client.graphql({
      query: mutations.deleteBoard,
      variables: { boardId }
    });
    return res.data.deleteBoard;
  },
  inviteMember: async (boardId, email, role) => {
    const res = await client.graphql({
      query: mutations.inviteMember,
      variables: { input: { boardId, email, role } }
    });
    return res.data.inviteMember;
  },
  respondToInvite: async (boardId, accept) => {
    const res = await client.graphql({
      query: mutations.respondToInvite,
      variables: { boardId, accept }
    });
    return res.data.respondToInvite;
  }
};

export const taskApi = {
  getTasks: async (boardId) => {
    const res = await client.graphql({
      query: queries.listTasksByBoard,
      variables: { boardId }
    });
    return res.data.listTasksByBoard || [];
  },
  listTasksByBoard: async (boardId) => {
    const res = await client.graphql({
      query: queries.listTasksByBoard,
      variables: { boardId }
    });
    return res.data.listTasksByBoard || [];
  },
  createTask: async (inputOrBoardId, taskData) => {
    let input;
    if (typeof inputOrBoardId === 'object') {
      input = inputOrBoardId;
    } else {
      input = { boardId: inputOrBoardId, ...taskData };
    }
    const res = await client.graphql({
      query: mutations.createTask,
      variables: { input }
    });
    return res.data.createTask;
  },
  moveTask: async (inputOrBoardId, taskId, columnId, position) => {
    let input;
    if (typeof inputOrBoardId === 'object') {
      // Called as moveTask({ boardId, taskId, newColumnId, newPosition })
      input = {
        boardId: inputOrBoardId.boardId,
        taskId: inputOrBoardId.taskId,
        newColumnId: inputOrBoardId.newColumnId || inputOrBoardId.columnId,
        newPosition: inputOrBoardId.newPosition ?? inputOrBoardId.position
      };
    } else {
      input = { boardId: inputOrBoardId, taskId, newColumnId: columnId, newPosition: position };
    }
    const res = await client.graphql({
      query: mutations.moveTask,
      variables: { input }
    });
    return res.data.moveTask;
  },
  updateTask: async (inputOrBoardId, taskId, updates) => {
    let input;
    if (typeof inputOrBoardId === 'object' && !taskId) {
      input = inputOrBoardId;
    } else {
      input = { boardId: inputOrBoardId, taskId, ...updates };
    }
    const res = await client.graphql({
      query: mutations.updateTask,
      variables: { input }
    });
    return res.data.updateTask;
  },
  deleteTask: async (boardId, taskId) => {
    const res = await client.graphql({
      query: mutations.deleteTask,
      variables: { boardId, taskId }
    });
    return res.data.deleteTask;
  }
};

export const notificationApi = {
  getNotifications: async () => {
    const res = await client.graphql({ query: queries.listMyNotifications });
    return res.data.listMyNotifications || [];
  },
  listMyNotifications: async () => {
    const res = await client.graphql({ query: queries.listMyNotifications });
    return res.data.listMyNotifications || [];
  },
  markAsRead: async (notificationId, timestamp) => {
    const res = await client.graphql({
      query: mutations.markNotificationRead,
      variables: { notificationId, timestamp: timestamp || new Date().toISOString() }
    });
    return res.data.markNotificationRead;
  }
};

export const subscriptionApi = {
  // Combined subscription method
  subscribeToBoard: (boardId, callbacks) => {
    const subscriptionsList = [];
    const addSub = (query, nextCallback) => {
      const sub = client.graphql({ query, variables: { boardId } }).subscribe({
        next: (data) => nextCallback(data.data),
        error: (error) => console.error('Subscription error', error)
      });
      subscriptionsList.push(sub);
    };
    if (callbacks.onTaskCreated) addSub(subscriptions.onTaskCreated, (d) => callbacks.onTaskCreated(d.onTaskCreated));
    if (callbacks.onTaskUpdated) addSub(subscriptions.onTaskUpdated, (d) => callbacks.onTaskUpdated(d.onTaskUpdated));
    if (callbacks.onTaskMoved) addSub(subscriptions.onTaskMoved, (d) => callbacks.onTaskMoved(d.onTaskMoved));
    if (callbacks.onTaskDeleted) addSub(subscriptions.onTaskDeleted, (d) => callbacks.onTaskDeleted(d.onTaskDeleted));
    if (callbacks.onBoardUpdated) addSub(subscriptions.onBoardUpdated, (d) => callbacks.onBoardUpdated(d.onBoardUpdated));
    return () => subscriptionsList.forEach(sub => sub.unsubscribe());
  },
  // Individual subscription methods (used by useBoard.js)
  subscribeToTaskCreated: (boardId, callback) => {
    const sub = client.graphql({ query: subscriptions.onTaskCreated, variables: { boardId } }).subscribe({
      next: (data) => callback(data.data.onTaskCreated),
      error: (error) => console.error('Subscription error', error)
    });
    return () => sub.unsubscribe();
  },
  subscribeToTaskUpdated: (boardId, callback) => {
    const sub = client.graphql({ query: subscriptions.onTaskUpdated, variables: { boardId } }).subscribe({
      next: (data) => callback(data.data.onTaskUpdated),
      error: (error) => console.error('Subscription error', error)
    });
    return () => sub.unsubscribe();
  },
  subscribeToTaskDeleted: (boardId, callback) => {
    const sub = client.graphql({ query: subscriptions.onTaskDeleted, variables: { boardId } }).subscribe({
      next: (data) => callback(data.data.onTaskDeleted),
      error: (error) => console.error('Subscription error', error)
    });
    return () => sub.unsubscribe();
  },
  subscribeToBoardUpdated: (boardId, callback) => {
    const sub = client.graphql({ query: subscriptions.onBoardUpdated, variables: { boardId } }).subscribe({
      next: (data) => callback(data.data.onBoardUpdated),
      error: (error) => console.error('Subscription error', error)
    });
    return () => sub.unsubscribe();
  },
  subscribeToNotifications: (userId, onNotification) => {
    const sub = client.graphql({
      query: subscriptions.onNotificationReceived,
      variables: { recipientId: userId }
    }).subscribe({
      next: (data) => onNotification(data.data.onNotificationReceived),
      error: (error) => console.error('Notification sub error', error)
    });
    return () => sub.unsubscribe();
  }
};
