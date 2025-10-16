const express = require('express');
const controller = require('./conversation.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

router.use(protect);
const ensureViewMessages = (req, res, next) => {
  if (req.user?.userType === 'worker') {
    return next();
  }
  return requirePermissions(['view_messages'], { requireBusinessId: false })(req, res, next);
};

const ensureSendMessages = (req, res, next) => {
  if (req.user?.userType === 'worker') {
    return next();
  }
  return requirePermissions(['send_messages'], { requireBusinessId: false })(req, res, next);
};

router.get('/', ensureViewMessages, controller.listConversations);
router.post('/', ensureSendMessages, controller.createConversation);
router.get('/:conversationId/messages', ensureViewMessages, controller.listMessages);
router.post('/:conversationId/messages', ensureSendMessages, controller.sendMessage);
router.patch('/:conversationId/read', ensureViewMessages, controller.markConversationRead);

module.exports = router;
