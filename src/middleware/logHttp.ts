import { Request, Response, NextFunction } from 'express';
import { SystemLog } from '../models/SystemLog';

export const logHttp = async (req: Request, res: Response, next: NextFunction) => {
  // Exclude /api/logs requests
  if (req.path.startsWith('/api/logs')) {
    return next();
  }

  // Capture user info if available
  let user = 'system';
  let role = 'admin'; // default to admin for system logs
  if ((req as any).user) {
    const u = (req as any).user;
    // Prefer firstName, fallback to name, then email
    const firstName = u.name || 'system';
    role = u.role || '';
    user = `${firstName} - ${role}`;
  } else {
    user = `system - ${role}`;
  }

  // Compose message
  const message = `${req.method} ${req.originalUrl}`;

  // Log entry
  SystemLog.create({
    timestamp: new Date(),
    level: 'INFO',
    user,
    role,
    message,
  }).catch(() => {}); // Don't block request on log failure

  next();
}; 