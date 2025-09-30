const express = require('express');
const controller = require('./conversation.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', requirePermissions(['view_messages']), controller.listConversations);
router.post('/', requirePermissions(['send_messages']), controller.createConversation);
router.get('/:conversationId/messages', requirePermissions(['view_messages']), controller.listMessages);
router.post('/:conversationId/messages', requirePermissions(['send_messages']), controller.sendMessage);
router.patch('/:conversationId/read', requirePermissions(['view_messages']), controller.markConversationRead);

module.exports = router;
