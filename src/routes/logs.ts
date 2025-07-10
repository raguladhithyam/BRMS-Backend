import express from 'express';
import {
  getSystemLogs,
  getLogStats,
  exportLogs,
} from '../controllers/logsController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// All logs routes require authentication and admin role
router.use(authenticate, authorize('admin'));

// Get system logs with filtering and pagination
router.get('/', getSystemLogs);

// Get log statistics
router.get('/stats', getLogStats);

// Export logs (JSON or CSV)
router.get('/export', exportLogs);

export default router; 