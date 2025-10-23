import { Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, LoginHistory } from '../models/associations';
import { getRedisClient } from '../config/redis';
import { sendEmail } from '../services/emailService';
import crypto from 'crypto';

interface AuthRequest extends Request {
  user?: User;
}

const generateToken = (id: string): string => {
  const secret = process.env.JWT_SECRET as Secret;
  return jwt.sign({ id }, secret, { expiresIn: '1d' });
};

const getClientInfo = (req: Request) => {
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  return { ipAddress, userAgent };
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, bloodGroup, rollNo, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
      return;
    }

    // If password is not provided, generate a temporary one
    let userPassword = password;
    let isTempPassword = false;
    if (!userPassword) {
      userPassword = crypto.randomBytes(4).toString('hex'); // 8-char temp password
      isTempPassword = true;
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password: userPassword,
      role: 'student',
      bloodGroup,
      rollNo,
      phone,
      availability: true,
    });

    // Send welcome email with temp password if generated
    if (isTempPassword) {
      const loginUrl = process.env.FRONTEND_URL;
      await sendEmail({
        to: [email],
        subject: 'Welcome to BloodConnect - Your Account Credentials',
        template: 'studentWelcome',
        data: {
          name,
          email,
          tempPassword: userPassword,
          loginUrl,
        },
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Store session in Redis
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.setEx(`session:${user.id}`, 7 * 24 * 60 * 60, token);
    } else {
      console.warn('⚠️ Redis not available, session not cached');
    }

    // Log login history
    const { ipAddress, userAgent } = getClientInfo(req);
    await LoginHistory.create({
      userId: user.id,
      ipAddress,
      userAgent,
      loginTime: new Date(),
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
      message: 'User registered successfully',
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({
      where: { email },
      attributes: { include: ['password'] },
    });

    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Update last login and availability for students
    const updateData: any = { lastLogin: new Date() };
    
    // For students, update availability based on donation eligibility
    if (user.role === 'student') {
      updateData.availability = user.isAvailableForDonation();
    }
    
    await user.update(updateData);

    // Generate token
    const token = generateToken(user.id);

    // Store session in Redis
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.setEx(`session:${user.id}`, 7 * 24 * 60 * 60, token);
    } else {
      console.warn('⚠️ Redis not available, session not cached');
    }

    // Log login history
    const { ipAddress, userAgent } = getClientInfo(req);
    
    // Mark previous sessions as inactive
    await LoginHistory.update(
      { isActive: false },
      { where: { userId: user.id, isActive: true } }
    );

    // Create new login record
    await LoginHistory.create({
      userId: user.id,
      ipAddress,
      userAgent,
      loginTime: new Date(),
      isActive: true,
    });

    res.json({
      success: true,
      data: {
        user,
        token,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      // Remove session from Redis
      const redisClient = getRedisClient();
      if (redisClient) {
        await redisClient.del(`session:${req.user.id}`);
      }
      
      // Update login history
      await LoginHistory.update(
        { 
          logoutTime: new Date(),
          isActive: false 
        },
        { 
          where: { 
            userId: req.user.id, 
            isActive: true 
          } 
        }
      );
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // For students, ensure availability is up to date
    if (req.user?.role === 'student') {
      const isAvailable = req.user.isAvailableForDonation();
      if (req.user.availability !== isAvailable) {
        await req.user.update({ availability: isAvailable });
      }
    }

    res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, bloodGroup, rollNo } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'Email already in use',
        });
        return;
      }
    }

    // Update user
    const updatedUser = await req.user.update({
      name: name || req.user.name,
      email: email || req.user.email,
      phone: phone || req.user.phone,
      bloodGroup: bloodGroup || req.user.bloodGroup,
      rollNo: rollNo || req.user.rollNo,
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Get user with password
    const userWithPassword = await User.findByPk(req.user.id, {
      attributes: { include: ['password'] },
    });

    if (!userWithPassword || !(await userWithPassword.comparePassword(currentPassword))) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    // Update password
    await userWithPassword.update({ password: newPassword });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getLoginHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await LoginHistory.findAndCountAll({
      where: { userId: req.user.id },
      order: [['loginTime', 'DESC']],
      limit: Number(limit),
      offset,
    });

    res.json({
      success: true,
      data: {
        data: rows,
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get login history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};