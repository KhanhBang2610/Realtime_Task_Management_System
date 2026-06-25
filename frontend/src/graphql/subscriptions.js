export const onTaskCreated = /* GraphQL */ `
  subscription OnTaskCreated($boardId: ID!) {
    onTaskCreated(boardId: $boardId) {
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

export const onTaskUpdated = /* GraphQL */ `
  subscription OnTaskUpdated($boardId: ID!) {
    onTaskUpdated(boardId: $boardId) {
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

export const onTaskDeleted = /* GraphQL */ `
  subscription OnTaskDeleted($boardId: ID!) {
    onTaskDeleted(boardId: $boardId) {
      taskId
      boardId
    }
  }
`;

export const onTaskMoved = /* GraphQL */ `
  subscription OnTaskMoved($boardId: ID!) {
    onTaskMoved(boardId: $boardId) {
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

export const onBoardUpdated = /* GraphQL */ `
  subscription OnBoardUpdated($boardId: ID!) {
    onBoardUpdated(boardId: $boardId) {
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

export const onNotificationReceived = /* GraphQL */ `
  subscription OnNotificationReceived($recipientId: ID!) {
    onNotificationReceived(recipientId: $recipientId) {
      notificationId
      recipientId
      type
      message
      actorId
      actorName
      boardId
      taskId
      isRead
      timestamp
      ttl
    }
  }
`;
