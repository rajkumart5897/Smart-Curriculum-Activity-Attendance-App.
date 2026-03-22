const express = require('express');
const router = express.Router();
const {
  createCourse,
  getCourses,
  getMyCourses
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('teacher', 'admin'), createCourse);
router.get('/', protect, getCourses);
router.get('/my-courses', protect, authorize('teacher', 'admin'), getMyCourses);

module.exports = router;