// userRoutes.ts
// Routes for user management.

import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { sendEmail } from '../services/emailService';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(['ADMIN', 'USER', 'MANAGER']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'USER',
      },
    });

    await sendEmail({
      to: user.email,
      subject: 'Welcome to Banking System',
      text: `Hi ${user.firstName}, your account has been created!`,
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    res.status(201).json({ user : { id: user.id, email: user.email, role: user.role }, token });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const data = registerSchema.partial().parse(req.body);
    if (req.user!.id !== req.params.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Cannot update other users' });
    }

    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user!.id !== req.params.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Cannot delete other users' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;