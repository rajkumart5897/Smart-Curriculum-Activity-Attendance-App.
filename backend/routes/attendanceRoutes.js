const express = require('express');
const router = express.Router();
const {
  generateQRCode,
  scanQRCode,
  getAttendanceByCourse,
  getStudentStats,
  markManualAttendance
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

// QR Code routes
router.post('/generate-qr', protect, authorize('teacher', 'admin'), generateQRCode);
router.post('/scan-qr', protect, scanQRCode);

// Attendance records
router.get('/course/:courseId', protect, getAttendanceByCourse);
router.get('/student/stats', protect, authorize('student'), getStudentStats);

// Manual marking
router.post('/manual', protect, authorize('teacher', 'admin'), markManualAttendance);

module.exports = router;

