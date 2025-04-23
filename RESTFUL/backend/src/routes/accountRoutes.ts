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
  const accounts = await prisma.account.findMany({
    where: { userId: req.user!.id },
  });
  res.json(accounts);
});

export default router;