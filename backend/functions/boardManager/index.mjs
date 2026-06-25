import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const BOARDS_TABLE = process.env.BOARDS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const ACTIVITY_TABLE = process.env.ACTIVITY_TABLE;
const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE;

const DEFAULT_COLUMNS = [
  { id: 'col-todo', name: 'To Do', position: 0 },
  { id: 'col-inprogress', name: 'In Progress', position: 1 },
  { id: 'col-review', name: 'Review', position: 2 },
  { id: 'col-done', name: 'Done', position: 3 },
];

export const handler = async (event) => {
  console.log('BoardManager event:', JSON.stringify(event, null, 2));

  const fieldName = event.info?.fieldName || event.fieldName;
  const args = event.arguments;
  const userId = event.identity?.sub || event.identity?.username;

  // Get userName from DynamoDB profile (more reliable than JWT claims)
  let userName = event.identity?.claims?.name || event.identity?.claims?.email || 'Unknown';
  try {
    const userResult = await dynamodb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    }));
    if (userResult.Item?.displayName) {
      userName = userResult.Item.displayName;
    }
  } catch (e) { /* fallback to JWT claims */ }

  try {
    switch (fieldName) {
      case 'createBoard':
        return await createBoard(args.input, userId, userName);
      case 'updateBoard':
        return await updateBoard(args.input, userId, userName);
      case 'deleteBoard':
        return await deleteBoard(args.boardId, userId);
      case 'inviteMember':
        return await inviteMember(args.input, userId, userName);
      case 'removeMember':
        return await removeMember(args.boardId, args.userId, userId);
      case 'respondToInvite':
        return await respondToInvite(args.boardId, args.accept, userId, userName);
      case 'getBoard':
        return await getBoard(args.boardId, userId);
      case 'listMyBoards':
        return await listMyBoards(userId);
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// ─── createBoard ───────────────────────────────────────────

async function createBoard(input, userId, userName) {
  const now = new Date().toISOString();
  const boardId = `board-${randomUUID()}`;

  const board = {
    boardId,
    name: input.name,
    description: input.description || '',
    ownerId: userId,
    ownerName: userName,
    columns: DEFAULT_COLUMNS,
    members: [
      {
        userId,
        displayName: userName,
        avatarUrl: null,
        role: 'OWNER',
        joinedAt: now,
      },
    ],
    backgroundColor: input.backgroundColor || '#1e40af',
    createdAt: now,
    updatedAt: now,
  };

  await dynamodb.send(new PutCommand({
    TableName: BOARDS_TABLE,
    Item: board,
  }));

  // Add boardId to user's boardIds list
  await dynamodb.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET boardIds = list_append(if_not_exists(boardIds, :empty), :newBoard)',
    ExpressionAttributeValues: {
      ':newBoard': [boardId],
      ':empty': [],
    },
  }));

  return board;
}

// ─── updateBoard ───────────────────────────────────────────

async function updateBoard(input, userId, userName) {
  const board = await getBoard(input.boardId, userId);
  const member = board.members.find((m) => m.userId === userId);
  if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
    throw new Error('Access denied: Only owner or admin can update board');
  }

  const now = new Date().toISOString();
  const updates = ['updatedAt = :now'];
  const values = { ':now': now };
  const names = {};

  if (input.name !== undefined) {
    updates.push('#name = :name');
    names['#name'] = 'name';
    values[':name'] = input.name;
  }
  if (input.description !== undefined) {
    updates.push('description = :desc');
    values[':desc'] = input.description;
  }
  if (input.backgroundColor !== undefined) {
    updates.push('backgroundColor = :bg');
    values[':bg'] = input.backgroundColor;
  }
  if (input.columns !== undefined) {
    updates.push('columns = :cols');
    values[':cols'] = input.columns;
  }

  const result = await dynamodb.send(new UpdateCommand({
    TableName: BOARDS_TABLE,
    Key: { boardId: input.boardId },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes;
}

// ─── deleteBoard ───────────────────────────────────────────

async function deleteBoard(boardId, userId) {
  const board = await getBoard(boardId, userId);
  if (board.ownerId !== userId) {
    throw new Error('Access denied: Only owner can delete board');
  }

  await dynamodb.send(new DeleteCommand({
    TableName: BOARDS_TABLE,
    Key: { boardId },
  }));

  // Remove boardId from all members' boardIds
  for (const member of board.members) {
    try {
      const user = await dynamodb.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: member.userId },
      }));
      if (user.Item?.boardIds) {
        const updatedBoardIds = user.Item.boardIds.filter((id) => id !== boardId);
        await dynamodb.send(new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { userId: member.userId },
          UpdateExpression: 'SET boardIds = :boards',
          ExpressionAttributeValues: { ':boards': updatedBoardIds },
        }));
      }
    } catch (e) {
      console.warn(`Failed to remove boardId from user ${member.userId}:`, e);
    }
  }

  return board;
}

// ─── inviteMember ──────────────────────────────────────────

async function inviteMember(input, userId, userName) {
  const board = await getBoard(input.boardId, userId);
  const inviter = board.members.find((m) => m.userId === userId);
  if (!inviter || inviter.role === 'MEMBER') {
    throw new Error('Access denied: Only owner or admin can invite members');
  }

  // Find user by email
  const emailResult = await dynamodb.send(new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': input.email },
  }));

  if (!emailResult.Items || emailResult.Items.length === 0) {
    throw new Error(`User with email ${input.email} not found. They need to sign up first.`);
  }

  const invitedUser = emailResult.Items[0];

  // Check if already member
  if (board.members.some((m) => m.userId === invitedUser.userId)) {
    throw new Error('User is already a member of this board');
  }

  const now = new Date().toISOString();
  const newMember = {
    userId: invitedUser.userId,
    displayName: invitedUser.displayName,
    avatarUrl: invitedUser.avatarUrl || null,
    role: input.role || 'MEMBER',
    joinedAt: now,
  };

  // Add member to board
  const result = await dynamodb.send(new UpdateCommand({
    TableName: BOARDS_TABLE,
    Key: { boardId: input.boardId },
    UpdateExpression: 'SET members = list_append(members, :newMember), updatedAt = :now',
    ExpressionAttributeValues: {
      ':newMember': [newMember],
      ':now': now,
    },
    ReturnValues: 'ALL_NEW',
  }));

  // Add boardId to invited user's boardIds
  await dynamodb.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId: invitedUser.userId },
    UpdateExpression: 'SET boardIds = list_append(if_not_exists(boardIds, :empty), :newBoard)',
    ExpressionAttributeValues: {
      ':newBoard': [input.boardId],
      ':empty': [],
    },
  }));

  // Send notification to invited user
  const notifNow = new Date().toISOString();
  await dynamodb.send(new PutCommand({
    TableName: NOTIFICATIONS_TABLE,
    Item: {
      recipientId: invitedUser.userId,
      timestamp: notifNow,
      notificationId: `notif-${randomUUID()}`,
      type: 'BOARD_INVITED',
      boardId: input.boardId,
      message: `Bạn đã được mời vào board "${board.name}"`,
      isRead: false,
      ttl: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    },
  }));

  return result.Attributes;
}

// ─── removeMember ──────────────────────────────────────────

async function removeMember(boardId, targetUserId, requesterId) {
  const board = await getBoard(boardId, requesterId);
  const requester = board.members.find((m) => m.userId === requesterId);

  if (!requester || (requester.role !== 'OWNER' && requester.role !== 'ADMIN')) {
    throw new Error('Access denied');
  }
  if (targetUserId === board.ownerId) {
    throw new Error('Cannot remove the board owner');
  }

  const updatedMembers = board.members.filter((m) => m.userId !== targetUserId);
  const now = new Date().toISOString();

  const result = await dynamodb.send(new UpdateCommand({
    TableName: BOARDS_TABLE,
    Key: { boardId },
    UpdateExpression: 'SET members = :members, updatedAt = :now',
    ExpressionAttributeValues: {
      ':members': updatedMembers,
      ':now': now,
    },
    ReturnValues: 'ALL_NEW',
  }));

  // Remove boardId from user's boardIds
  const user = await dynamodb.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId: targetUserId },
  }));
  if (user.Item?.boardIds) {
    const updatedBoardIds = user.Item.boardIds.filter((id) => id !== boardId);
    await dynamodb.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId: targetUserId },
      UpdateExpression: 'SET boardIds = :boards',
      ExpressionAttributeValues: { ':boards': updatedBoardIds },
    }));
  }

  return result.Attributes;
}

// ─── getBoard ──────────────────────────────────────────────

async function getBoard(boardId, userId) {
  const result = await dynamodb.send(new GetCommand({
    TableName: BOARDS_TABLE,
    Key: { boardId },
  }));
  if (!result.Item) throw new Error('Board not found');
  const isMember = result.Item.members?.some((m) => m.userId === userId);
  if (!isMember) throw new Error('Access denied: You are not a member of this board');
  return result.Item;
}

// ─── listMyBoards ──────────────────────────────────────────

async function listMyBoards(userId) {
  // Get user's boardIds
  const user = await dynamodb.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  }));

  const boardIds = user.Item?.boardIds || [];
  if (boardIds.length === 0) return [];

  // BatchGet boards
  const keys = boardIds.map((id) => ({ boardId: id }));

  // DynamoDB BatchGet limit is 100 items
  const batches = [];
  for (let i = 0; i < keys.length; i += 100) {
    batches.push(keys.slice(i, i + 100));
  }

  const allBoards = [];
  for (const batch of batches) {
    const result = await dynamodb.send(new BatchGetCommand({
      RequestItems: {
        [BOARDS_TABLE]: { Keys: batch },
      },
    }));
    if (result.Responses?.[BOARDS_TABLE]) {
      allBoards.push(...result.Responses[BOARDS_TABLE]);
    }
  }

  // Sort by updatedAt desc
  allBoards.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  return allBoards;
}
// ─── respondToInvite ───────────────────────────────────────

async function respondToInvite(boardId, accept, userId, userName) {
  if (!accept) {
    // Treat reject as leaving the board.
    const boardResult = await dynamodb.send(new GetCommand({
      TableName: BOARDS_TABLE,
      Key: { boardId },
    }));
    
    if (!boardResult.Item) throw new Error('Board not found');
    
    // Remove the user from members
    const updatedMembers = boardResult.Item.members.filter((m) => m.userId !== userId);
    
    const result = await dynamodb.send(new UpdateCommand({
      TableName: BOARDS_TABLE,
      Key: { boardId },
      UpdateExpression: 'SET members = :members, updatedAt = :now',
      ExpressionAttributeValues: {
        ':members': updatedMembers,
        ':now': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }));

    // Remove boardId from user's boardIds
    const user = await dynamodb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    }));
    if (user.Item?.boardIds) {
      const updatedBoardIds = user.Item.boardIds.filter((id) => id !== boardId);
      await dynamodb.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'SET boardIds = :boards',
        ExpressionAttributeValues: { ':boards': updatedBoardIds },
      }));
    }

    return result.Attributes;
  } else {
    // If accept = true, we actually don't need to do anything because inviteMember already added them to the board.
    const board = await dynamodb.send(new GetCommand({
      TableName: BOARDS_TABLE,
      Key: { boardId },
    }));
    return board.Item;
  }
}
