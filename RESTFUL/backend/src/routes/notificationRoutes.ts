// notificationRoutes.ts
// Routes for notification management.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();

const notificationSchema = z.object({
  message: z.string().min(1),
  type: z.enum(['TRANSACTION', 'ACCOUNT', 'SYSTEM']),
});

router.post('/', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const data = notificationSchema.parse(req.body);
    const notification = await prisma.notification.create({
      data: {
        userId: req.body.userId,
        message: data.message,
        type: data.type,
      },
    });
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  const where = req.user!.role === 'ADMIN' ? {} : { userId: req.user!.id };
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  res.json(notifications);
});

router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification || (notification.userId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Forbidden: Cannot update notification' });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification || (notification.userId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Forbidden: Cannot delete notification' });
    }

    await prisma.notification.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;