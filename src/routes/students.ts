import express from 'express';
import { updateAvailability } from '../controllers/studentController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

router.put('/availability', authenticate, authorize('student'), updateAvailability);

export default router;