import { Request, Response } from 'express';
import { User } from '../models/User';

interface AuthRequest extends Request {
  user?: User;
}

export const updateAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { availability } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const updatedUser = await req.user.update({ availability });

    res.json({
      success: true,
      data: updatedUser,
      message: `Availability updated to ${availability ? 'available' : 'unavailable'}`,
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};