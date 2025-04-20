// userRoutes.ts
// Routes for user management.

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendEmail } from '../services/emailService';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const userSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(['ADMIN', 'USER', 'MANAGER']).optional(),
});

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const data = userSchema.parse(req.body);
    const user = await prisma.user.create({
      data: {
        clerkId: req.body.clerkId,
        ...data,
        role: data.role || 'USER',
      },
    });

    await sendEmail({
      to: user.email,
      subject: 'Welcome to Banking System',
      text: `Hi ${user.firstName}, your account has been created!`,
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

export default router;