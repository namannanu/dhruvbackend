const express = require('express');
const controller = require('./application.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router({ mergeParams: true });

router.use(protect);
router.get('/', controller.listApplications);
router.get('/me', controller.listMyApplications);
router.post('/:jobId/apply', controller.createApplication);
router.patch('/:applicationId/withdraw', (req, res, next) => {
  req.body = { ...req.body, status: 'withdrawn' };
  return controller.updateApplication(req, res, next);
});
router.patch('/:applicationId', controller.updateApplication);

module.exports = router;
