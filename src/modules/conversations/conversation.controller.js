const Conversation = require('./conversation.model');
const Message = require('./message.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

exports.listConversations = catchAsync(async (req, res) => {
  const filter = { participants: req.user._id };
  if (req.query.jobId) {
    filter.job = req.query.jobId;
  }
  const conversations = await Conversation.find(filter)
    .sort({ updatedAt: -1 })
    .populate('job');
  res.status(200).json({ status: 'success', data: conversations });
});

exports.createConversation = catchAsync(async (req, res, next) => {
  const participants = Array.from(new Set([...req.body.participants, req.user._id.toString()]));
  if (participants.length < 2) {
    return next(new AppError('Conversation requires at least two participants', 400));
  }
  const conversation = await Conversation.create({
    participants,
    job: req.body.job || null
  });
  res.status(201).json({ status: 'success', data: conversation });
});

exports.listMessages = catchAsync(async (req, res, next) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation || !conversation.participants.includes(req.user._id)) {
    return next(new AppError('Conversation not found', 404));
  }
  const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });
  res.status(200).json({ status: 'success', data: messages });
});

exports.sendMessage = catchAsync(async (req, res, next) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation || !conversation.participants.includes(req.user._id)) {
    return next(new AppError('Conversation not found', 404));
  }
  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    body: req.body.body
  });
  conversation.lastMessageSnippet = req.body.body.slice(0, 120);
  conversation.lastMessageAt = new Date();
  conversation.updatedAt = new Date();
  conversation.participants.forEach((participant) => {
    const key = participant.toString();
    const unread = conversation.unreadCounts.get(key) || 0;
    conversation.unreadCounts.set(key, key === req.user._id.toString() ? 0 : unread + 1);
  });
  await conversation.save();
  res.status(201).json({ status: 'success', data: message });
});

exports.markConversationRead = catchAsync(async (req, res, next) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation || !conversation.participants.includes(req.user._id)) {
    return next(new AppError('Conversation not found', 404));
  }
  conversation.unreadCounts.set(req.user._id.toString(), 0);
  await conversation.save();
  res.status(200).json({ status: 'success', data: conversation });
});
