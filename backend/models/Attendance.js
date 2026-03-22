const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  sessionType: {
    type: String,
    enum: ['lecture', 'lab', 'tutorial', 'practical'],
    default: 'lecture'
  },
  
  startTime: String,
  endTime: String,
  
  markingMethod: {
    type: String,
    enum: ['manual', 'qr-code', 'geolocation'],
    default: 'qr-code'
  },
  
  // QR Code data
  qrCode: String,
  qrCodeExpiry: Date,
  
  // Location data (optional)
  location: {
    latitude: Number,
    longitude: Number,
    radius: Number
  },
  
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  records: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'absent'
    },
    markedAt: Date,
    remarks: String
  }],
  
  totalStudents: Number,
  presentCount: {
    type: Number,
    default: 0
  },
  absentCount: {
    type: Number,
    default: 0
  },
  
  topicCovered: String,
  
  isFinalized: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
attendanceSchema.index({ course: 1, date: 1 });
attendanceSchema.index({ 'records.student': 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);

