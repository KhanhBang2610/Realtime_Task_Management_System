export const createUserProfile = /* GraphQL */ `
  mutation CreateUserProfile($displayName: String!, $email: String!) {
    createUserProfile(displayName: $displayName, email: $email) {
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

export const updateUserProfile = /* GraphQL */ `
  mutation UpdateUserProfile($displayName: String, $avatarUrl: String) {
    updateUserProfile(displayName: $displayName, avatarUrl: $avatarUrl) {
      userId
      email
      displayName
    }
  }
`;

export const createBoard = /* GraphQL */ `
  mutation CreateBoard($input: CreateBoardInput!) {
    createBoard(input: $input) {
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

export const updateBoard = /* GraphQL */ `
  mutation UpdateBoard($input: UpdateBoardInput!) {
    updateBoard(input: $input) {
      boardId
      name
      description
      backgroundColor
    }
  }
`;

export const deleteBoard = /* GraphQL */ `
  mutation DeleteBoard($boardId: ID!) {
    deleteBoard(boardId: $boardId) {
      boardId
    }
  }
`;

export const inviteMember = /* GraphQL */ `
  mutation InviteMember($input: InviteMemberInput!) {
    inviteMember(input: $input) {
      boardId
      members {
        userId
        displayName
        role
      }
    }
  }
`;

export const createTask = /* GraphQL */ `
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
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

export const updateTask = /* GraphQL */ `
  mutation UpdateTask($input: UpdateTaskInput!) {
    updateTask(input: $input) {
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

export const moveTask = /* GraphQL */ `
  mutation MoveTask($input: MoveTaskInput!) {
    moveTask(input: $input) {
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

export const deleteTask = /* GraphQL */ `
  mutation DeleteTask($boardId: ID!, $taskId: ID!) {
    deleteTask(boardId: $boardId, taskId: $taskId) {
      taskId
      boardId
    }
  }
`;

export const markNotificationRead = /* GraphQL */ `
  mutation MarkNotificationRead($notificationId: ID!, $timestamp: AWSDateTime!) {
    markNotificationRead(notificationId: $notificationId, timestamp: $timestamp) {
      notificationId
      isRead
    }
  }
`;

export const respondToInvite = /* GraphQL */ `
  mutation RespondToInvite($boardId: ID!, $accept: Boolean!) {
    respondToInvite(boardId: $boardId, accept: $accept) {
      boardId
    }
  }
`;
