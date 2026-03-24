const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const WasteLog = require('../models/WasteLog');
const PantryItem = require('../models/PantryItem');
const authMiddleware = require('../middleware/auth');

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
          loggedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$estimatedValue' },
          byCategory: { $push: { category: '$category', reason: '$reason' } },
        },
      },
    ]);

    const categoryBreakdown = await WasteLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          loggedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          value: { $sum: '$estimatedValue' },
        },
      },
    ]);

    res.json({
      summary: stats[0] || { totalItems: 0, totalValue: 0 },
      categories: categoryBreakdown,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get detailed time-series waste data for charts
router.get('/timeline/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    // Verify user can only access their own data
    if (userId !== req.userId && userId !== req.userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const daysNum = parseInt(days);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    // Get daily aggregated data with category breakdown
    const timelineData = await WasteLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          loggedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$loggedAt' } },
            category: '$category',
          },
          quantity: { $sum: '$quantity' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Get daily totals (for chart)
    const dailyTotals = await WasteLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          loggedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$loggedAt' } },
          totalQuantity: { $sum: '$quantity' },
          totalCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get category totals
    const categoryTotals = await WasteLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          loggedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$category',
          totalQuantity: { $sum: '$quantity' },
          totalCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);

    // Format timeline data for stacked chart
    const chartData = {};
    timelineData.forEach((item) => {
      const date = item._id.date;
      if (!chartData[date]) {
        chartData[date] = { date };
      }
      chartData[date][item._id.category] = item.quantity || 0;
    });

    // Fill in missing dates with zeros
    const dates = [];
    for (let i = 0; i < daysNum; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toISOString().split('T')[0];
      dates.unshift(dateStr);
    }

    const formattedData = dates.map((date) => {
      if (chartData[date]) {
        return chartData[date];
      }
      return { date };
    });

    res.json({
      timelineData: formattedData,
      dailyTotals,
      categoryTotals,
      period: daysNum,
    });
  } catch (err) {
    console.error('Error fetching timeline data:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
