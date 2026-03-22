const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('class');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get additional stats based on role
    let stats = {};
    
    if (user.role === 'student') {
      // Get enrolled courses
      const courses = await Course.find({ class: user.class }).populate('instructor', 'firstName lastName');
      
      // Get overall attendance stats
      const attendances = await Attendance.find({
        'records.student': user._id
      });
      
      const totalClasses = attendances.length;
      const presentClasses = attendances.filter(a =>
        a.records.find(r => 
          r.student.toString() === user._id.toString() && r.status === 'present'
        )
      ).length;
      
      const percentage = totalClasses > 0 
        ? ((presentClasses / totalClasses) * 100).toFixed(2)
        : 0;

      stats = {
        totalCourses: courses.length,
        totalClasses,
        presentClasses,
        absentClasses: totalClasses - presentClasses,
        attendancePercentage: percentage
      };
    } else if (user.role === 'teacher') {
      // Get courses taught
      const courses = await Course.find({ instructor: user._id }).populate('class');
      
      // Get recent attendance sessions
      const recentSessions = await Attendance.find({ markedBy: user._id })
        .sort({ date: -1 })
        .limit(5)
        .populate('course', 'courseName');

      stats = {
        coursesTaught: courses.length,
        recentSessions: recentSessions.length,
        courses: courses.map(c => ({
          id: c._id,
          name: c.courseName,
          code: c.courseCode,
          class: c.class?.name
        }))
      };
    }

    res.json({
      success: true,
      user,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, dateOfBirth } = req.body;
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    const user = await User.findById(req.user.userId).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

