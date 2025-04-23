// authMiddleware.ts
// Middleware for Clerk authentication and authorization.

import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { prisma } from '../config/db';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; clerkId: string; role: string };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const { userId } = await clerkClient.verifyToken(token);
    if (!userId || typeof userId !== 'string') {
      return res.status(401).json({ error: 'Invalid token: No valid userId' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = {
      id: user.id,
      clerkId: user.clerkId,
      role: user.role,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: `Invalid token: ${(error as Error).message}` });
  }
};

export const roleMiddleware = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }
    next();
  };
};