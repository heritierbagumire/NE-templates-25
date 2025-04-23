// notificationRoutes.ts
// Routes for notification management.

import { Router } from 'express';
import { prisma } from '../config/db';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(notifications);
});

router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id, userId: req.user!.id },
      data: { read: true },
    });
    res.json(notification);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;