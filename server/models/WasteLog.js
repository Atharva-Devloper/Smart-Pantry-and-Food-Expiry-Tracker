const mongoose = require('mongoose');

const wasteLogSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    reason: {
      type: String,
      enum: ['expired', 'spoiled', 'over-purchased', 'other'],
      default: 'expired',
    },
    estimatedValue: {
      type: Number,
      default: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WasteLog', wasteLogSchema);
