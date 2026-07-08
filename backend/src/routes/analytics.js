const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { success } = require('../utils/response');
const { authUser } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.post('/events', authUser, async (req, res) => {
  const { event, params = {} } = req.body;
  if (!event) {
    return res.status(400).json({ code: 40001, message: '缺少 event' });
  }
  await prisma.analyticsEvent.create({
    data: {
      event,
      params: JSON.stringify(params),
      userId: req.userId,
    },
  });
  return success(res, null);
});

router.get('/events/summary', async (_req, res) => {
  const events = await prisma.analyticsEvent.groupBy({
    by: ['event'],
    _count: { event: true },
    orderBy: { _count: { event: 'desc' } },
  });
  return success(res, events);
});

module.exports = router;
