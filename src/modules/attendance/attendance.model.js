const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business'
    },
    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },
    clockInAt: Date,
    clockOutAt: Date,
    status: {
      type: String,
      enum: ['scheduled', 'clocked-in', 'completed', 'missed'],
      default: 'scheduled'
    },
    totalHours: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    isLate: { type: Boolean, default: false },
    notes: String
  },
  { timestamps: true }
);

attendanceSchema.index({ worker: 1, scheduledStart: -1 });
attendanceSchema.index({ business: 1, scheduledStart: -1 });

module.exports = mongoose.model('AttendanceRecord', attendanceSchema);
