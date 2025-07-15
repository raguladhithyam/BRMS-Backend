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
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  updateAssignedDonor,
  completeDonation,
  approveAndGenerateCertificate,
  getDonationStatistics,
  downloadDonationReport,
  deleteRequest,
} from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
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

// All admin routes require authentication and admin role
router.use(authenticate, authorize('admin'));

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/blood-groups', getBloodGroupStats);
router.get('/dashboard/donation-stats', getDonationStatistics);
router.get('/dashboard/donation-report', downloadDonationReport);

// Blood request management
router.get('/requests', getAllRequests);
router.get('/requests/:id', getRequestById);
router.post('/requests/:id/approve', approveRequest);
router.post('/requests/:id/reject', rejectRequest);
router.post('/requests/:id/fulfill', fulfillRequest);
router.delete('/requests/:id', deleteRequest);

// Student management
router.get('/students', getAllStudents);
router.post('/students', validate(schemas.createStudent), createStudent);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);
router.post('/students/bulk-upload', upload.single('file'), bulkUploadStudents);

// Admin management
router.get('/admins', getAllAdmins);
router.post('/admins', createAdmin);
router.put('/admins/:id', updateAdmin);
router.delete('/admins/:id', deleteAdmin);

// Request management
router.put('/requests/:requestId/assign-donor', updateAssignedDonor);
router.post('/requests/:requestId/complete-donation', upload.single('geotagPhoto'), completeDonation);

// Certificate management
router.post('/certificates/:certificateId/approve-and-generate', approveAndGenerateCertificate);

export default router;