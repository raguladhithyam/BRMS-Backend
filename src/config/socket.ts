import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export const setupSocketIO = (io: Server): void => {
  // Authentication middleware for socket connections
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected with role ${socket.userRole}`);

    // Join role-based rooms
    if (socket.userRole === 'admin') {
      socket.join('admins');
    } else if (socket.userRole === 'student') {
      socket.join('students');
      socket.join(`student_${socket.userId}`);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });

    // Handle custom events
    socket.on('join_room', (room: string) => {
      socket.join(room);
    });

    socket.on('leave_room', (room: string) => {
      socket.leave(room);
    });
  });
};

export const emitToAdmins = (io: Server, event: string, data: any): void => {
  io.to('admins').emit(event, data);
};

export const emitToStudents = (io: Server, event: string, data: any): void => {
  io.to('students').emit(event, data);
};

export const emitToUser = (io: Server, userId: string, event: string, data: any): void => {
  io.to(`student_${userId}`).emit(event, data);
};

export const emitToAll = (io: Server, event: string, data: any): void => {
  io.emit(event, data);
};