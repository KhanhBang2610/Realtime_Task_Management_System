import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE;

export const handler = async (event) => {
  console.log('UserManager event:', JSON.stringify(event, null, 2));

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
