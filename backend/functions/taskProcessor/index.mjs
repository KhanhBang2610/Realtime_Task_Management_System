import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TASKS_TABLE = process.env.TASKS_TABLE;
const BOARDS_TABLE = process.env.BOARDS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const ACTIVITY_TABLE = process.env.ACTIVITY_TABLE;
const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE;

export const handler = async (event) => {
  console.log('TaskProcessor event:', JSON.stringify(event, null, 2));

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
      case 'createTask':
        return await createTask(args.input, userId, userName);
      case 'updateTask':
        return await updateTask(args.input, userId, userName);
      case 'moveTask':
        return await moveTask(args.input, userId, userName);
      case 'deleteTask':
        return await deleteTask(args.boardId, args.taskId, userId, userName);
      case 'listTasksByBoard':
        return await listTasksByBoard(args.boardId, userId);
      case 'getTask':
        return await getTask(args.boardId, args.taskId);
      case 'listMyAssignedTasks':
        return await listMyAssignedTasks(userId);
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// ─── Helpers ───────────────────────────────────────────────

async function validateBoardMember(boardId, userId) {
  const result = await dynamodb.send(new GetCommand({
    TableName: BOARDS_TABLE,
    Key: { boardId },
  }));
  if (!result.Item) throw new Error('Board not found');
  const isMember = result.Item.members?.some((m) => m.userId === userId);
  if (!isMember) throw new Error('Access denied: You are not a member of this board');
  return result.Item;
}

async function writeActivityLog(boardId, data) {
  const now = new Date().toISOString();
  await dynamodb.send(new PutCommand({
    TableName: ACTIVITY_TABLE,
    Item: {
      boardId,
      timestamp: now,
      logId: `log-${randomUUID()}`,
      action: data.action,
      userId: data.userId,
      userName: data.userName,
      targetType: 'TASK',
      targetId: data.targetId,
      details: JSON.stringify(data.details || {}),
      ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
    },
  }));
}

async function notifyBoardMembers(boardId, excludeUserId, data) {
  if (!NOTIFICATIONS_TABLE) return;
  try {
    const board = await dynamodb.send(new GetCommand({
      TableName: BOARDS_TABLE,
      Key: { boardId },
    }));
    const members = board.Item?.members || [];
    for (const member of members) {
      if (member.userId === excludeUserId) continue;
      await dynamodb.send(new PutCommand({
        TableName: NOTIFICATIONS_TABLE,
        Item: {
          recipientId: member.userId,
          timestamp: new Date().toISOString(),
          notificationId: `notif-${randomUUID()}`,
          type: data.type,
          boardId,
          message: data.message,
          isRead: false,
          ttl: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
        },
      }));
    }
  } catch (err) {
    console.error('Failed to notify board members:', err);
  }
}

// ─── createTask ────────────────────────────────────────────

async function createTask(input, userId, userName) {
  const board = await validateBoardMember(input.boardId, userId);

  let assigneeName = null;
  if (input.assigneeId) {
    const user = await dynamodb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId: input.assigneeId },
    }));
    assigneeName = user.Item?.displayName || null;
  }

  const now = new Date().toISOString();
  const taskId = `task-${randomUUID()}`;

  const task = {
    boardId: input.boardId,
    taskId,
    title: input.title,
    description: input.description || '',
    columnId: input.columnId,
    position: input.position ?? 0,
    createdBy: userId,
    priority: input.priority || 'MEDIUM',
    dueDate: input.dueDate || null,
    labels: input.labels || [],
    createdAt: now,
    updatedAt: now,
  };

  if (input.assigneeId) {
    task.assigneeId = input.assigneeId;
    task.assigneeName = assigneeName;
  }

  await dynamodb.send(new PutCommand({
    TableName: TASKS_TABLE,
    Item: task,
  }));

  await writeActivityLog(input.boardId, {
    action: 'TASK_CREATED',
    userId,
    userName,
    targetId: taskId,
    details: { title: input.title, columnId: input.columnId },
  });

  const column = board.columns?.find(c => c.id === input.columnId);
  const columnName = column ? column.name : input.columnId;

  await notifyBoardMembers(input.boardId, userId, {
    type: 'TASK_CREATED',
    message: `${userName} đã tạo task "${input.title}" trong bảng "${board.name}"`,
  });

  if (input.assigneeId && input.assigneeId !== userId) {
    await dynamodb.send(new PutCommand({
      TableName: NOTIFICATIONS_TABLE,
      Item: {
        recipientId: input.assigneeId,
        timestamp: new Date().toISOString(),
        notificationId: `notif-${randomUUID()}`,
        type: 'TASK_ASSIGNED',
        boardId: input.boardId,
        message: `${userName} đã giao task "${input.title}" cho bạn`,
        isRead: false,
        ttl: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
      },
    }));
  }

  return task;
}

// ─── updateTask ────────────────────────────────────────────

async function updateTask(input, userId, userName) {
  await validateBoardMember(input.boardId, userId);

  const now = new Date().toISOString();
  const updates = [];
  const names = {};
  const values = { ':now': now };

  if (input.title !== undefined) {
    updates.push('#title = :title');
    names['#title'] = 'title';
    values[':title'] = input.title;
  }
  if (input.description !== undefined) {
    updates.push('description = :desc');
    values[':desc'] = input.description;
  }
  if (input.assigneeId !== undefined) {
    updates.push('assigneeId = :assignee');
    values[':assignee'] = input.assigneeId;
    // Also update assigneeName
    let assigneeName = null;
    if (input.assigneeId) {
      const user = await dynamodb.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: input.assigneeId },
      }));
      assigneeName = user.Item?.displayName || null;
    }
    updates.push('assigneeName = :assigneeName');
    values[':assigneeName'] = assigneeName;
  }
  if (input.priority !== undefined) {
    updates.push('priority = :priority');
    values[':priority'] = input.priority;
  }
  if (input.dueDate !== undefined) {
    updates.push('dueDate = :dueDate');
    values[':dueDate'] = input.dueDate;
  }
  if (input.labels !== undefined) {
    updates.push('labels = :labels');
    values[':labels'] = input.labels;
  }

  updates.push('updatedAt = :now');

  const result = await dynamodb.send(new UpdateCommand({
    TableName: TASKS_TABLE,
    Key: { boardId: input.boardId, taskId: input.taskId },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));

  await writeActivityLog(input.boardId, {
    action: 'TASK_UPDATED',
    userId,
    userName,
    targetId: input.taskId,
    details: { changes: Object.keys(input).filter((k) => k !== 'boardId' && k !== 'taskId') },
  });

  const board = await validateBoardMember(input.boardId, userId);
  await notifyBoardMembers(input.boardId, userId, {
    type: 'TASK_UPDATED',
    message: `${userName} đã cập nhật task "${input.title || 'không tên'}" trong bảng "${board.name}"`,
  });

  return result.Attributes;
}

// ─── moveTask ──────────────────────────────────────────────

async function moveTask(input, userId, userName) {
  const board = await validateBoardMember(input.boardId, userId);

  // Get current task
  const current = await dynamodb.send(new GetCommand({
    TableName: TASKS_TABLE,
    Key: { boardId: input.boardId, taskId: input.taskId },
  }));
  if (!current.Item) throw new Error('Task not found');

  const oldColumnId = current.Item.columnId;
  const now = new Date().toISOString();

  const result = await dynamodb.send(new UpdateCommand({
    TableName: TASKS_TABLE,
    Key: { boardId: input.boardId, taskId: input.taskId },
    UpdateExpression: 'SET columnId = :col, #pos = :pos, updatedAt = :now',
    ExpressionAttributeNames: { '#pos': 'position' },
    ExpressionAttributeValues: {
      ':col': input.newColumnId,
      ':pos': input.newPosition,
      ':now': now,
    },
    ReturnValues: 'ALL_NEW',
  }));

  await writeActivityLog(input.boardId, {
    action: 'TASK_MOVED',
    userId,
    userName,
    targetId: input.taskId,
    details: {
      taskTitle: current.Item.title,
      fromColumn: oldColumnId,
      toColumn: input.newColumnId,
    },
  });

  const oldColumn = board.columns?.find(c => c.id === oldColumnId);
  const newColumn = board.columns?.find(c => c.id === input.newColumnId);

  // Notify board members with userName
  await notifyBoardMembers(input.boardId, userId, {
    type: 'TASK_MOVED',
    message: `${userName} đã chuyển task "${current.Item.title}" từ cột "${oldColumn ? oldColumn.name : oldColumnId}" sang "${newColumn ? newColumn.name : input.newColumnId}"`,
  });

  return result.Attributes;
}

// ─── deleteTask ────────────────────────────────────────────

async function deleteTask(boardId, taskId, userId, userName) {
  const board = await validateBoardMember(boardId, userId);

  const current = await dynamodb.send(new GetCommand({
    TableName: TASKS_TABLE,
    Key: { boardId, taskId },
  }));
  if (!current.Item) throw new Error('Task not found');

  await dynamodb.send(new DeleteCommand({
    TableName: TASKS_TABLE,
    Key: { boardId, taskId },
  }));

  await writeActivityLog(boardId, {
    action: 'TASK_DELETED',
    userId,
    userName,
    targetId: taskId,
    details: { title: current.Item.title },
  });

  await notifyBoardMembers(boardId, userId, {
    type: 'TASK_DELETED',
    message: `${userName} đã xoá task "${current.Item.title}" khỏi bảng "${board.name}"`,
  });

  return current.Item;
}

// ─── listTasksByBoard ──────────────────────────────────────

async function listTasksByBoard(boardId, userId) {
  await validateBoardMember(boardId, userId);

  const result = await dynamodb.send(new QueryCommand({
    TableName: TASKS_TABLE,
    KeyConditionExpression: 'boardId = :boardId',
    ExpressionAttributeValues: { ':boardId': boardId },
  }));

  return result.Items || [];
}

// ─── getTask ───────────────────────────────────────────────

async function getTask(boardId, taskId) {
  const result = await dynamodb.send(new GetCommand({
    TableName: TASKS_TABLE,
    Key: { boardId, taskId },
  }));
  return result.Item || null;
}

// ─── listMyAssignedTasks ───────────────────────────────────

async function listMyAssignedTasks(userId) {
  const result = await dynamodb.send(new QueryCommand({
    TableName: TASKS_TABLE,
    IndexName: 'AssigneeIndex',
    KeyConditionExpression: 'assigneeId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    ScanIndexForward: false,
  }));
  return result.Items || [];
}
