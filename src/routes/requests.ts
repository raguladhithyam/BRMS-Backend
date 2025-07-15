import express from 'express';
import {
  createBloodRequest,
  getMatchingRequests,
  optInToRequest,
  getStudentOptIns,
} from '../controllers/requestController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { completeDonation } from '../controllers/adminController';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

const router = express.Router();

// Public route for creating blood requests
router.post('/', validate(schemas.bloodRequest), createBloodRequest);

// Student routes
router.get('/matching', authenticate, authorize('student'), getMatchingRequests);
router.post('/:id/opt-in', authenticate, authorize('student'), optInToRequest);
router.get('/opt-ins', authenticate, authorize('student'), getStudentOptIns);
// Student donation completion route
router.post('/:requestId/complete-donation', authenticate, authorize('student'), upload.single('geotagPhoto'), completeDonation);

export default router;