const mongoose = require('mongoose');
const Notification = require('./notification.model');
const AppError = require('../../shared/utils/appError');

const PRIORITIES = new Set(['low', 'medium', 'high']);

const normalizeObjectId = (value) => {
  if (!value) {
    return undefined;
  }
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }
  if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return undefined;
};

const ensurePriority = (priority) => {
  if (!priority || typeof priority !== 'string') {
    return 'low';
  }
  const normalized = priority.toLowerCase();
  return PRIORITIES.has(normalized) ? normalized : 'low';
};

const ensureMessage = (message, body) => {
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }
  return null;
};

const ensureMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  return metadata;
};

const createNotification = async ({
  recipient,
  recipientId,
  user,
  userId,
  type,
  priority,
  title,
  message,
  body,
  actionUrl,
  metadata,
  sender,
  senderId,
  senderUserId
} = {}) => {
  const targetId =
    normalizeObjectId(recipient) ||
    normalizeObjectId(recipientId) ||
    normalizeObjectId(user) ||
    normalizeObjectId(userId);

  if (!targetId) {
    throw new AppError('Recipient user is required to create a notification', 400);
  }

  const resolvedMessage = ensureMessage(message, body);
  if (!resolvedMessage) {
    throw new AppError('Notification message is required', 400);
  }

  if (!title || !String(title).trim()) {
    throw new AppError('Notification title is required', 400);
  }

  const payload = {
    user: targetId,
    sender:
      normalizeObjectId(sender) ||
      normalizeObjectId(senderId) ||
      normalizeObjectId(senderUserId) ||
      null,
    type: type || 'system',
    priority: ensurePriority(priority),
    title: String(title).trim(),
    message: resolvedMessage,
    metadata: ensureMetadata(metadata)
  };

  if (actionUrl) {
    payload.actionUrl = actionUrl;
  }

  return Notification.create(payload);
};

const sendSafeNotification = async (payload = {}) => {
  try {
    return await createNotification(payload);
  } catch (error) {
    console.error('Failed to create notification', {
      message: error.message,
      type: payload.type,
      recipient: payload.recipient || payload.user || payload.userId || payload.recipientId
    });
    return null;
  }
};

module.exports = {
  createNotification,
  sendSafeNotification
};
