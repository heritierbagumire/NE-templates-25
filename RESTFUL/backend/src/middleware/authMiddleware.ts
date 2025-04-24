// authMiddleware.ts
// Middleware for JWT authentication and authorization.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken'; // CHANGED: Replaced '@clerk/clerk-sdk-node' with 'jsonwebtoken'
import { prisma } from '../config/db';

declare global {
  namespace Express {
    interface Request {
      // CHANGED: Replaced 'clerkId' with 'email' to align with manual auth
      user?: { id: string; email: string; role: string };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // UNCHANGED: Extract token from Authorization header
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    // CHANGED: Replaced clerkClient.verifyToken with jwt.verify
    // Old: const { userId } = await clerkClient.verifyToken(token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    // CHANGED: Query by 'id' instead of 'clerkId'
    // Old: const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // CHANGED: Set req.user with 'email' instead of 'clerkId'
    req.user = {
      id: user.id,
      email: user.email, // New field
      role: user.role,
    };
    next();
  } catch (error) {
    // UNCHANGED: Handle invalid token, but refined error message
    res.status(401).json({ error: 'Invalid token' });
  }
};

// UNCHANGED: Role middleware remains identical
export const roleMiddleware = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }
    next();
  };
};