// transactionRoutes.ts
// Routes for transaction management.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { authMiddleware } from '../middleware/authMiddleware';
import { sendEmail } from '../services/emailService';

const router = Router();

const transactionSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().positive(),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']),
  description: z.string().optional(),
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const data = transactionSchema.parse(req.body);
    const user = req.user!;

    const account = await prisma.account.findUnique({
      where: { id: data.accountId },
    });
    if (!account || (account.userId !== user.id && user.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Invalid account' });
    }

    let newBalance = account.balance;
    if (data.type === 'DEPOSIT') {
      newBalance += data.amount;
    } else if (data.type === 'WITHDRAWAL' || data.type === 'TRANSFER') {
      if (account.balance < data.amount) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }
      newBalance -= data.amount;
    }

    const transaction = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          accountId: data.accountId,
          userId: user.id,
          amount: data.amount,
          type: data.type,
          description: data.description,
        },
      }),
      prisma.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      }),
    ]);

    await sendEmail({
      to: user.email,
      subject: `New ${data.type} Transaction`,
      text: `A ${data.type} of $${data.amount} was processed on your account ${account.accountNumber}.`,
    });

    res.status(201).json(transaction[0]);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;

  const where = req.user!.role === 'ADMIN' ? {} : { userId: req.user!.id };
  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const total = await prisma.transaction.count({ where });

  res.json({ transactions, total });
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const data = transactionSchema.partial().parse(req.body);
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
    });

    if (!transaction || (transaction.userId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Forbidden: Cannot update transaction' });
    }

    const updated = await prisma.transaction.update({
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
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
    });

    if (!transaction || (transaction.userId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Forbidden: Cannot delete transaction' });
    }

    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;