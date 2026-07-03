import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { checkProjectMembership, requireRole } from '../../utils/authHelpers.mjs';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE;
const BOARDS_TABLE = process.env.BOARDS_TABLE;

/**
 * Lambda handler for User/Member Management with RBAC
 * Supports HTTP methods: GET, POST, DELETE, PATCH
 * All methods require project membership check
 * POST, DELETE, PATCH require admin role
 */
export const handler = async (event) => {
  console.log('UserManager event:', JSON.stringify(event, null, 2));

  try {
    // Parse user from authorizer context
    let user;
    try {
      user = JSON.parse(event.requestContext?.authorizer?.user || '{}');
    } catch (parseError) {
      console.error('Failed to parse user from authorizer:', parseError);
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized: Invalid user context' }),
      };
    }

    // Extract projectId from path parameters
    const projectId = event.pathParameters?.id;
    if (!projectId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Bad Request: projectId is required' }),
      };
    }

    // Check project membership for all methods
    if (!checkProjectMembership(user, projectId)) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Forbidden: You are not a member of this project' }),
      };
    }

    const httpMethod = event.httpMethod || event.requestContext?.http?.method;

    switch (httpMethod) {
      case 'GET':
        // List members - All project members allowed
        return await listMembers(projectId);

      case 'POST':
        // Invite member - Admin only
        if (!requireRole(['admin'])(user)) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Forbidden: Admin role required to invite members' }),
          };
        }
        return await inviteMember(projectId, event.body);

      case 'DELETE':
        // Remove member - Admin only
        if (!requireRole(['admin'])(user)) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Forbidden: Admin role required to remove members' }),
          };
        }
        return await removeMember(projectId, event.pathParameters?.memberId);

      case 'PATCH':
        // Change role - Admin only
        if (!requireRole(['admin'])(user)) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Forbidden: Admin role required to change member roles' }),
          };
        }
        return await changeMemberRole(projectId, event.pathParameters?.memberId, event.body);

      default:
        return {
          statusCode: 405,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `Method Not Allowed: ${httpMethod}` }),
        };
    }
  } catch (error) {
    console.error('Error in UserManager handler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};

// ─── Handler Functions ─────────────────────────────────────

/**
 * GET - List all members of a project/board
 */
async function listMembers(projectId) {
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: BOARDS_TABLE,
      Key: { boardId: projectId },
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Project not found' }),
      };
    }

    const members = result.Item.members || [];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members }),
    };
  } catch (error) {
    console.error('Error listing members:', error);
    throw error;
  }
}

/**
 * POST - Invite a new member to the project
 */
async function inviteMember(projectId, bodyString) {
  try {
    const body = JSON.parse(bodyString || '{}');
    const { userId, email, role = 'member' } = body;

    if (!userId && !email) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Bad Request: userId or email is required' }),
      };
    }

    // Get the board
    const boardResult = await dynamodb.send(new GetCommand({
      TableName: BOARDS_TABLE,
      Key: { boardId: projectId },
    }));

    if (!boardResult.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Project not found' }),
      };
    }

    const board = boardResult.Item;
    const members = board.members || [];

    // Check if member already exists
    const existingMember = members.find(m => m.userId === userId || m.email === email);
    if (existingMember) {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Member already exists in project' }),
      };
    }

    // Add new member
    const newMember = {
      userId: userId || null,
      email: email || null,
      role: role,
      joinedAt: new Date().toISOString(),
    };

    members.push(newMember);

    // Update board
    await dynamodb.send(new UpdateCommand({
      TableName: BOARDS_TABLE,
      Key: { boardId: projectId },
      UpdateExpression: 'SET members = :members, updatedAt = :now',
      ExpressionAttributeValues: {
        ':members': members,
        ':now': new Date().toISOString(),
      },
    }));

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Member invited successfully', member: newMember }),
    };
  } catch (error) {
    console.error('Error inviting member:', error);
    throw error;
  }
}

/**
 * DELETE - Remove a member from the project
 */
async function removeMember(projectId, memberId) {
  try {
    if (!memberId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Bad Request: memberId is required' }),
      };
    }

    // Get the board
    const boardResult = await dynamodb.send(new GetCommand({
      TableName: BOARDS_TABLE,
      Key: { boardId: projectId },
    }));

    if (!boardResult.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Project not found' }),
      };
    }

    const board = boardResult.Item;
    const members = board.members || [];

    // Remove member
    const updatedMembers = members.filter(m => m.userId !== memberId);

    if (updatedMembers.length === members.length) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Member not found in project' }),
      };
    }

    // Update board
    await dynamodb.send(new UpdateCommand({
      TableName: BOARDS_TABLE,
      Key: { boardId: projectId },
      UpdateExpression: 'SET members = :members, updatedAt = :now',
      ExpressionAttributeValues: {
        ':members': updatedMembers,
        ':now': new Date().toISOString(),
      },
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Member removed successfully' }),
    };
  } catch (error) {
    console.error('Error removing member:', error);
    throw error;
  }
}

/**
 * PATCH - Change a member's role
 */
async function changeMemberRole(projectId, memberId, bodyString) {
  try {
    if (!memberId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Bad Request: memberId is required' }),
      };
    }

    const body = JSON.parse(bodyString || '{}');
    const { role } = body;

    if (!role || !['admin', 'member'].includes(role)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Bad Request: Valid role (admin or member) is required' }),
      };
    }

    // Get the board
    const boardResult = await dynamodb.send(new GetCommand({
      TableName: BOARDS_TABLE,
      Key: { boardId: projectId },
    }));

    if (!boardResult.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Project not found' }),
      };
    }

    const board = boardResult.Item;
    const members = board.members || [];

    // Find and update member
    const memberIndex = members.findIndex(m => m.userId === memberId);

    if (memberIndex === -1) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Member not found in project' }),
      };
    }

    members[memberIndex].role = role;
    members[memberIndex].roleUpdatedAt = new Date().toISOString();

    // Update board
    await dynamodb.send(new UpdateCommand({
      TableName: BOARDS_TABLE,
      Key: { boardId: projectId },
      UpdateExpression: 'SET members = :members, updatedAt = :now',
      ExpressionAttributeValues: {
        ':members': members,
        ':now': new Date().toISOString(),
      },
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Member role updated successfully', member: members[memberIndex] }),
    };
  } catch (error) {
    console.error('Error changing member role:', error);
    throw error;
  }
}

// ─── Legacy GraphQL Functions (Keep for backward compatibility) ─────

async function createUserProfile(userId, displayName, email) {
  const now = new Date().toISOString();

  const user = {
    userId,
    email,
    displayName,
    avatarUrl: null,
    boardIds: [],
    createdAt: now,
    updatedAt: now,
  };

  await dynamodb.send(new PutCommand({
    TableName: USERS_TABLE,
    Item: user,
    ConditionExpression: 'attribute_not_exists(userId)',
  })).catch((err) => {
    if (err.name === 'ConditionalCheckFailedException') {
      // User already exists, return existing
      return dynamodb.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId },
      }));
    }
    throw err;
  });

  // Return the created or existing user
  const result = await dynamodb.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  }));

  return result.Item || user;
}

async function updateUserProfile(userId, args) {
  const now = new Date().toISOString();
  const updates = ['updatedAt = :now'];
  const values = { ':now': now };

  if (args.displayName !== undefined) {
    updates.push('displayName = :name');
    values[':name'] = args.displayName;
  }
  if (args.avatarUrl !== undefined) {
    updates.push('avatarUrl = :avatar');
    values[':avatar'] = args.avatarUrl;
  }

  const result = await dynamodb.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes;
}

async function getMyProfile(userId) {
  const result = await dynamodb.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  }));
  return result.Item || null;
}

async function getUserById(userId) {
  const result = await dynamodb.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  }));
  return result.Item || null;
}

/**
 * GraphQL handler for backward compatibility
 * Routes GraphQL queries/mutations to appropriate functions
 */
export const graphqlHandler = async (event) => {
  console.log('UserManager GraphQL event:', JSON.stringify(event, null, 2));

  const fieldName = event.info?.fieldName || event.fieldName;
  const args = event.arguments;
  const userId = event.identity?.sub || event.identity?.username;

  try {
    switch (fieldName) {
      case 'createUserProfile':
        return await createUserProfile(userId, args.displayName, args.email);
      case 'updateUserProfile':
        return await updateUserProfile(userId, args);
      case 'getMyProfile':
        return await getMyProfile(userId);
      case 'getUserById':
        return await getUserById(args.userId);
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
