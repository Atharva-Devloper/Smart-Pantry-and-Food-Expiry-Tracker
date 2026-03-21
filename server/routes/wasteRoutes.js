const express = require('express');
const router = express.Router();
const WasteLog = require('../models/WasteLog');
const PantryItem = require('../models/PantryItem');

// Log a wasted item (usually called when deleting from pantry with a reason)
router.post('/', async (req, res) => {
  try {
    const waste = new WasteLog(req.body);
    const newLog = await waste.save();
    res.status(201).json(newLog);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get waste analytics for a user
router.get('/analytics', async (req, res) => {
  try {
    const { userId, days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await WasteLog.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId),
          loggedAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$estimatedValue' },
          byCategory: { $push: { category: '$category', reason: '$reason' } }
        }
      }
    ]);

    const categoryBreakdown = await WasteLog.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), loggedAt: { $gte: startDate } } },
        { $group: { _id: '$category', count: { $sum: 1 }, value: { $sum: '$estimatedValue' } } }
    ]);

    res.json({
      summary: stats[0] || { totalItems: 0, totalValue: 0 },
      categories: categoryBreakdown
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
