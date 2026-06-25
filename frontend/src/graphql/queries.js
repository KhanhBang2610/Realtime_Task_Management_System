export const getMyProfile = /* GraphQL */ `
  query GetMyProfile {
    getMyProfile {
      userId
      email
      displayName
      avatarUrl
      boardIds
      createdAt
      updatedAt
    }
  }
`;

export const getUserById = /* GraphQL */ `
  query GetUserById($userId: ID!) {
    getUserById(userId: $userId) {
      userId
      displayName
      avatarUrl
      email
    }
  }
`;

export const getBoard = /* GraphQL */ `
  query GetBoard($boardId: ID!) {
    getBoard(boardId: $boardId) {
      boardId
      name
      description
      ownerId
      ownerName
      columns {
        id
        name
        position
      }
      members {
        userId
        displayName
        avatarUrl
        role
        joinedAt
      }
      backgroundColor
      createdAt
      updatedAt
    }
  }
`;

export const listMyBoards = /* GraphQL */ `
  query ListMyBoards {
    listMyBoards {
      boardId
      name
      description
      ownerId
      ownerName
      columns {
        id
        name
        position
      }
      members {
        userId
        displayName
        avatarUrl
        role
        joinedAt
      }
      backgroundColor
      createdAt
      updatedAt
    }
  }
`;

export const getTask = /* GraphQL */ `
  query GetTask($boardId: ID!, $taskId: ID!) {
    getTask(boardId: $boardId, taskId: $taskId) {
      taskId
      boardId
      title
      description
      columnId
      position
      assigneeId
      assigneeName
      createdBy
      priority
      dueDate
      labels
      createdAt
      updatedAt
    }
  }
`;

export const listTasksByBoard = /* GraphQL */ `
  query ListTasksByBoard($boardId: ID!) {
    listTasksByBoard(boardId: $boardId) {
      taskId
      boardId
      title
      description
      columnId
      position
      assigneeId
      assigneeName
      createdBy
      priority
      dueDate
      labels
      createdAt
      updatedAt
    }
  }
`;

export const listMyAssignedTasks = /* GraphQL */ `
  query ListMyAssignedTasks {
    listMyAssignedTasks {
      taskId
      boardId
      title
      description
      columnId
      position
      assigneeId
      assigneeName
      createdBy
      priority
      dueDate
      labels
      createdAt
      updatedAt
    }
  }
`;

export const listMyNotifications = /* GraphQL */ `
  query ListMyNotifications($limit: Int) {
    listMyNotifications(limit: $limit) {
      notificationId
      recipientId
      type
      message
      boardId
      isRead
      timestamp
    }
  }
`;

export const listActivityLogs = /* GraphQL */ `
  query ListActivityLogs($boardId: ID!, $limit: Int) {
    listActivityLogs(boardId: $boardId, limit: $limit) {
      logId
      boardId
      userId
      userName
      action
      targetType
      targetId
      timestamp
    }
  }
`;
