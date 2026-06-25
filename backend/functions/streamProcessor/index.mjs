import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

const ddbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(ddbClient);
const sns = new SNSClient({});

const BOARDS_TABLE = process.env.BOARDS_TABLE;
const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

export const handler = async (event) => {
  console.log('StreamProcessor records:', event.Records?.length);

  for (const record of event.Records) {
    try {
      if (record.eventSource !== 'aws:dynamodb') continue;
      await processRecord(record);
    } catch (error) {
      console.error('Error processing record:', error);
      // Don't rethrow — avoid retrying the entire batch
    }
  }
};

async function processRecord(record) {
  const eventName = record.eventName; // INSERT, MODIFY, REMOVE
  const newImage = record.dynamodb.NewImage ? unmarshall(record.dynamodb.NewImage) : null;
  const oldImage = record.dynamodb.OldImage ? unmarshall(record.dynamodb.OldImage) : null;

  let notifType = '';
  let message = '';
  let boardId = newImage?.boardId || oldImage?.boardId;
  let excludeUserId = null;

  switch (eventName) {
    case 'INSERT': {
      notifType = 'TASK_CREATED';
      message = `Task mới "${newImage.title}" đã được tạo`;
      excludeUserId = newImage.createdBy;

      // If task is assigned, send extra notification
      if (newImage.assigneeId && newImage.assigneeId !== newImage.createdBy) {
        await saveNotification(newImage.assigneeId, {
          type: 'TASK_ASSIGNED',
          boardId,
          message: `Bạn được giao task: "${newImage.title}"`,
        });
      }
      break;
    }

    case 'MODIFY': {
      if (oldImage.columnId !== newImage.columnId) {
        notifType = 'TASK_MOVED';
        message = `Task "${newImage.title}" đã chuyển sang cột khác`;
      } else if (oldImage.assigneeId !== newImage.assigneeId && newImage.assigneeId) {
        notifType = 'TASK_ASSIGNED';
        await saveNotification(newImage.assigneeId, {
          type: 'TASK_ASSIGNED',
          boardId,
          message: `Bạn được giao task: "${newImage.title}"`,
        });
        return; // Don't send board-wide notification for reassignment
      } else {
        notifType = 'TASK_UPDATED';
        message = `Task "${newImage.title}" đã được cập nhật`;
      }
      break;
    }

    case 'REMOVE': {
      notifType = 'TASK_DELETED';
      message = `Task "${oldImage.title}" đã bị xóa`;
      break;
    }

    default:
      return;
  }

  if (!boardId || !message) return;

  // Get board members
  try {
    const board = await dynamodb.send(new GetCommand({
      TableName: BOARDS_TABLE,
      Key: { boardId },
    }));

    const members = board.Item?.members || [];

    // In-app notifications are now handled by taskProcessor to include userName and exact column names.

    // Publish to SNS for external notifications (email, push)
    if (SNS_TOPIC_ARN) {
      await sns.send(new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify({
          type: notifType,
          boardId,
          boardName: board.Item?.name,
          message,
          timestamp: new Date().toISOString(),
          members: members.map((m) => m.userId),
        }),
        Subject: 'Task Notification',
        MessageAttributes: {
          notificationType: {
            DataType: 'String',
            StringValue: notifType,
          },
        },
      }));
    }
  } catch (error) {
    console.error('Error notifying board members:', error);
  }
}

async function saveNotification(recipientId, data) {
  const now = new Date().toISOString();
  await dynamodb.send(new PutCommand({
    TableName: NOTIFICATIONS_TABLE,
    Item: {
      recipientId,
      timestamp: now,
      notificationId: `notif-${randomUUID()}`,
      type: data.type,
      boardId: data.boardId || null,
      message: data.message,
      isRead: false,
      ttl: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
    },
  }));
}
