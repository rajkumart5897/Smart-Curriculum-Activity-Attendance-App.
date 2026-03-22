const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const Class = require('../models/Class');
const QRCode = require('qrcode');
const crypto = require('crypto');

// @desc    Generate QR code for attendance session
// @route   POST /api/attendance/generate-qr
// @access  Private (Teacher only)
exports.generateQRCode = async (req, res) => {
  try {
    const { courseId, classId, sessionType, topicCovered } = req.body;

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Verify teacher is instructor
    if (course.instructor.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only course instructor can generate QR code'
      });
    }

    // Generate unique code
    const qrData = {
      code: crypto.randomBytes(16).toString('hex'),
      courseId,
      classId,
      timestamp: Date.now()
    };

    // QR expires in 5 minutes
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);

    // Get class students for total count
    const classData = await Class.findById(classId).populate('students');
    const totalStudents = classData ? classData.students.length : 0;

    // Create attendance session
    const attendance = await Attendance.create({
      course: courseId,
      class: classId,
      date: new Date(),
      sessionType: sessionType || 'lecture',
      markedBy: req.user.userId,
      markingMethod: 'qr-code',
      qrCode: qrData.code,
      qrCodeExpiry: expiryTime,
      topicCovered,
      totalStudents,
      records: []
    });

    // Generate QR code image (base64)
    const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData));

    res.status(201).json({
      success: true,
      message: 'QR code generated successfully',
      data: {
        attendanceId: attendance._id,
        qrCode: qrCodeImage,
        qrCodeData: qrData.code,
        expiresAt: expiryTime,
        totalStudents
      }
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating QR code',
      error: error.message
    });
  }
};

// @desc    Mark attendance by scanning QR
// @route   POST /api/attendance/scan-qr
// @access  Private (Student)
exports.scanQRCode = async (req, res) => {
  try {
    const { qrCode } = req.body;
    const studentId = req.user.userId;

    if (!qrCode) {
      return res.status(400).json({
        success: false,
        message: 'QR code is required'
      });
    }

    // Find active attendance session
    const attendance = await Attendance.findOne({
      qrCode: qrCode,
      qrCodeExpiry: { $gt: new Date() },
      isFinalized: false
    }).populate('course', 'courseName courseCode');

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired QR code'
      });
    }

    // Check if already marked
    const existingRecord = attendance.records.find(
      r => r.student.toString() === studentId
    );

    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this session'
      });
    }

    // Add attendance record
    attendance.records.push({
      student: studentId,
      status: 'present',
      markedAt: new Date()
    });

    attendance.presentCount = (attendance.presentCount || 0) + 1;
    await attendance.save();

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        course: attendance.course,
        status: 'present',
        markedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Scan QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking attendance',
      error: error.message
    });
  }
};

// @desc    Get attendance records for a course
// @route   GET /api/attendance/course/:courseId
// @access  Private
exports.getAttendanceByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { startDate, endDate } = req.query;

    let query = { course: courseId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendances = await Attendance.find(query)
      .populate('markedBy', 'firstName lastName')
      .populate('records.student', 'firstName lastName studentId')
      .sort({ date: -1 });

    res.json({
      success: true,
      count: attendances.length,
      data: attendances
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records',
      error: error.message
    });
  }
};

// @desc    Get student attendance stats
// @route   GET /api/attendance/student/stats
// @access  Private (Student)
exports.getStudentStats = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { courseId } = req.query;

    let query = { 'records.student': studentId };
    if (courseId) {
      query.course = courseId;
    }

    const attendances = await Attendance.find(query).populate('course', 'courseName courseCode');

    // Calculate stats per course
    const courseStats = {};

    attendances.forEach(attendance => {
      const courseKey = attendance.course._id.toString();
      
      if (!courseStats[courseKey]) {
        courseStats[courseKey] = {
          course: attendance.course,
          totalClasses: 0,
          present: 0,
          absent: 0,
          late: 0,
          percentage: 0
        };
      }

      courseStats[courseKey].totalClasses++;

      const record = attendance.records.find(r => r.student.toString() === studentId);
      if (record) {
        if (record.status === 'present') courseStats[courseKey].present++;
        else if (record.status === 'late') courseStats[courseKey].late++;
        else courseStats[courseKey].absent++;
      } else {
        courseStats[courseKey].absent++;
      }
    });

    // Calculate percentages
    Object.values(courseStats).forEach(stat => {
      stat.percentage = stat.totalClasses > 0 
        ? ((stat.present / stat.totalClasses) * 100).toFixed(2)
        : 0;
    });

    res.json({
      success: true,
      data: Object.values(courseStats)
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student statistics',
      error: error.message
    });
  }
};

// @desc    Manual attendance marking by teacher
// @route   POST /api/attendance/manual
// @access  Private (Teacher)
exports.markManualAttendance = async (req, res) => {
  try {
    const { courseId, classId, sessionType, topicCovered, records } = req.body;

    // Verify course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Verify teacher
    if (course.instructor.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only course instructor can mark attendance'
      });
    }

    // Count present/absent
    let presentCount = 0;
    let absentCount = 0;

    records.forEach(record => {
      if (record.status === 'present' || record.status === 'late') {
        presentCount++;
      } else {
        absentCount++;
      }
    });

    // Create attendance
    const attendance = await Attendance.create({
      course: courseId,
      class: classId,
      date: new Date(),
      sessionType: sessionType || 'lecture',
      markedBy: req.user.userId,
      markingMethod: 'manual',
      topicCovered,
      totalStudents: records.length,
      presentCount,
      absentCount,
      records: records.map(r => ({
        student: r.studentId,
        status: r.status,
        markedAt: new Date(),
        remarks: r.remarks
      })),
      isFinalized: true
    });

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking attendance',
      error: error.message
    });
  }
};
