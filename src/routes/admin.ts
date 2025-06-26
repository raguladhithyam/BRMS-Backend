import express from 'express';
import {
  getAllRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  fulfillRequest,
  getDashboardStats,
  getBloodGroupStats,
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkUploadStudents,
} from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// All admin routes require authentication and admin role
router.use(authenticate, authorize('admin'));

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/blood-groups', getBloodGroupStats);

// Blood request management
router.get('/requests', getAllRequests);
router.get('/requests/:id', getRequestById);
router.post('/requests/:id/approve', approveRequest);
router.post('/requests/:id/reject', rejectRequest);
router.post('/requests/:id/fulfill', fulfillRequest);

// Student management
router.get('/students', getAllStudents);
router.post('/students', validate(schemas.createStudent), createStudent);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);
router.post('/students/bulk-upload', upload.single('file'), bulkUploadStudents);

export default router;