const Course = require('../models/Course');
const Class = require('../models/Class');

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private (Teacher/Admin)
exports.createCourse = async (req, res) => {
  try {
    const { courseCode, courseName, credits, classId, schedule } = req.body;

    // Check if course code exists
    const existingCourse = await Course.findOne({ courseCode });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'Course code already exists'
      });
    }

    const course = await Course.create({
      courseCode,
      courseName,
      credits,
      instructor: req.user.userId,
      class: classId,
      schedule
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating course',
      error: error.message
    });
  }
};

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private
exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .populate('instructor', 'firstName lastName')
      .populate('class', 'name department year');

    res.json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
};

// @desc    Get courses by instructor
// @route   GET /api/courses/my-courses
// @access  Private (Teacher)
exports.getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({ 
      instructor: req.user.userId,
      isActive: true 
    }).populate('class', 'name department year');

    res.json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
};

