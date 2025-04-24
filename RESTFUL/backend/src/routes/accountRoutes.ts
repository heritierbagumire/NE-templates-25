// accountRoutes.ts
// Routes for account management.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

const accountSchema = z.object({
  accountNumber: z.string().min(10).max(20),
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const data = accountSchema.parse(req.body);
    const user = req.user!;

    const account = await prisma.account.create({
      data: {
        userId: user.id,
        accountNumber: data.accountNumber,
        balance: 0.0,
      },
    });

    res.status(201).json(account);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  const where = req.user!.role === 'ADMIN' ? {} : { userId: req.user!.id };
  const accounts = await prisma.account.findMany({ where });
  res.json(accounts);
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const data = accountSchema.partial().parse(req.body);
    const account = await prisma.account.findUnique({
      where: { id: req.params.id },
    });

    if (!account || (account.userId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Forbidden: Cannot update account' });
    }

    const updated = await prisma.account.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.params.id },
    });

    if (!account || (account.userId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Forbidden: Cannot delete account' });
    }

    await prisma.account.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;