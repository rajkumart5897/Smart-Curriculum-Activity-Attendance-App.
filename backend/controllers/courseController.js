const Course = require('../models/Course');
const Class = require('../models/Class');

// @desc    Create a new course (with auto-class creation)
// @route   POST /api/courses
// @access  Private (Teacher/Admin)
exports.createCourse = async (req, res) => {
  try {
    const { courseCode, courseName, credits } = req.body;

    // Check if course code exists
    const existingCourse = await Course.findOne({ courseCode });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'Course code already exists'
      });
    }

    // Create a default class for this course if none exists
    let defaultClass = await Class.findOne({ 
      name: 'Default Class',
      academicYear: '2024-2025' 
    });

    if (!defaultClass) {
      defaultClass = await Class.create({
        name: 'Default Class',
        department: 'General',
        year: 1,
        semester: 1,
        academicYear: '2024-2025',
        coordinator: req.user.userId,
        students: [],
        isActive: true
      });
    }

    const course = await Course.create({
      courseCode,
      courseName,
      credits,
      instructor: req.user.userId,
      class: defaultClass._id,
      schedule: [],
      semester: 1,
      academicYear: '2024-2025'
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    console.error('Create course error:', error);
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
    console.error('Get my courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
};

