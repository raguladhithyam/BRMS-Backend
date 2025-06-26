import express from 'express';
import {
  createBloodRequest,
  getMatchingRequests,
  optInToRequest,
  getStudentOptIns,
} from '../controllers/requestController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';

const router = express.Router();

// Public route for creating blood requests
router.post('/', validate(schemas.bloodRequest), createBloodRequest);

// Student routes
router.get('/matching', authenticate, authorize('student'), getMatchingRequests);
router.post('/:id/opt-in', authenticate, authorize('student'), optInToRequest);
router.get('/opt-ins', authenticate, authorize('student'), getStudentOptIns);

export default router;