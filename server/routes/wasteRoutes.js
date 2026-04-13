const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const WasteLog = require('../models/WasteLog');
const PantryItem = require('../models/PantryItem');
const authMiddleware = require('../middleware/auth');

const quantityExpr = { $ifNull: ['$quantity', 0] };
const unitExpr = { $ifNull: ['$quantityUnit', 'units'] };

const unitFamilyExpr = {
    $switch: {
        branches: [
            { case: { $in: [unitExpr, ['g', 'kg', 'oz', 'lb']] }, then: 'mass' },
            {
                case: { $in: [unitExpr, ['ml', 'l', 'cups', 'tbsp', 'tsp']] },
                then: 'volume',
            },
        ],
        default: 'discrete',
    },
};

const normalizedQuantityExpr = {
    $switch: {
        branches: [
            { case: { $eq: [unitExpr, 'kg'] }, then: { $multiply: [quantityExpr, 1000] } },
            { case: { $eq: [unitExpr, 'oz'] }, then: { $multiply: [quantityExpr, 28.3495] } },
            { case: { $eq: [unitExpr, 'lb'] }, then: { $multiply: [quantityExpr, 453.592] } },
            { case: { $eq: [unitExpr, 'l'] }, then: { $multiply: [quantityExpr, 1000] } },
            { case: { $eq: [unitExpr, 'cups'] }, then: { $multiply: [quantityExpr, 240] } },
            { case: { $eq: [unitExpr, 'tbsp'] }, then: { $multiply: [quantityExpr, 15] } },
            { case: { $eq: [unitExpr, 'tsp'] }, then: { $multiply: [quantityExpr, 5] } },
        ],
        default: quantityExpr,
    },
};

const buildTimelinePayload = async (userId, days) => {
    const daysNum = Math.max(parseInt(days, 10) || 30, 1);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    // Get daily aggregated data with category breakdown by count.
    const timelineData = await WasteLog.aggregate([
        {
            $match: {
                userId: userObjectId,
                loggedAt: { $gte: startDate },
            },
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$loggedAt' } },
                    category: '$category',
                },
                count: { $sum: 1 },
            },
        },
        { $sort: { '_id.date': 1 } },
    ]);

    // Get daily totals by item count (safe across mixed units).
    const dailyTotals = await WasteLog.aggregate([
        {
            $match: {
                userId: userObjectId,
                loggedAt: { $gte: startDate },
            },
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$loggedAt' } },
                totalCount: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    // Get category totals by count.
    const categoryTotals = await WasteLog.aggregate([
        {
            $match: {
                userId: userObjectId,
                loggedAt: { $gte: startDate },
            },
        },
        {
            $group: {
                _id: '$category',
                totalCount: { $sum: 1 },
            },
        },
        { $sort: { totalCount: -1 } },
    ]);

    // Quantity totals by normalized unit family.
    const familyTotals = await WasteLog.aggregate([
        {
            $match: {
                userId: userObjectId,
                loggedAt: { $gte: startDate },
            },
        },
        {
            $addFields: {
                unitFamily: unitFamilyExpr,
                normalizedQuantity: normalizedQuantityExpr,
            },
        },
        {
            $group: {
                _id: '$unitFamily',
                totalNormalizedQuantity: { $sum: '$normalizedQuantity' },
                totalCount: { $sum: 1 },
            },
        },
    ]);

    const dailyFamilyRaw = await WasteLog.aggregate([
        {
            $match: {
                userId: userObjectId,
                loggedAt: { $gte: startDate },
            },
        },
        {
            $addFields: {
                unitFamily: unitFamilyExpr,
                normalizedQuantity: normalizedQuantityExpr,
            },
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$loggedAt' } },
                    unitFamily: '$unitFamily',
                },
                totalNormalizedQuantity: { $sum: '$normalizedQuantity' },
            },
        },
        { $sort: { '_id.date': 1 } },
    ]);

    const valueTotals = await WasteLog.aggregate([
        {
            $match: {
                userId: userObjectId,
                loggedAt: { $gte: startDate },
            },
        },
        {
            $group: {
                _id: null,
                totalEstimatedValue: { $sum: { $ifNull: ['$estimatedValue', 0] } },
            },
        },
    ]);

    // Format timeline data for stacked chart
    const chartData = {};
    timelineData.forEach((item) => {
        const date = item._id.date;
        if (!chartData[date]) {
            chartData[date] = { date };
        }
        chartData[date][item._id.category] = item.count || 0;
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

    // Build cumulative count series for trend visualization.
    let runningTotal = 0;
    const dailyMap = new Map(dailyTotals.map((d) => [d._id, d.totalCount || 0]));
    const cumulativeDailyTotals = dates.map((date) => {
        runningTotal += dailyMap.get(date) || 0;
        return { date, cumulativeCount: runningTotal };
    });

    const dailyFamilyMap = {};
    dailyFamilyRaw.forEach((entry) => {
        const date = entry._id.date;
        if (!dailyFamilyMap[date]) {
            dailyFamilyMap[date] = { date, mass: 0, volume: 0, discrete: 0 };
        }
        dailyFamilyMap[date][entry._id.unitFamily] = entry.totalNormalizedQuantity || 0;
    });

    const dailyFamilyTotals = dates.map(
        (date) => dailyFamilyMap[date] || { date, mass: 0, volume: 0, discrete: 0 }
    );

    return {
        timelineData: formattedData,
        dailyTotals,
        cumulativeDailyTotals,
        dailyFamilyTotals,
        familyTotals,
        totalEstimatedValue: valueTotals[0]?.totalEstimatedValue || 0,
        categoryTotals,
        period: daysNum,
    };
};

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

// Get detailed time-series waste data for charts for the authenticated user
router.get('/timeline', authMiddleware, async (req, res) => {
    try {
        const payload = await buildTimelinePayload(req.userId, req.query.days);
        res.json(payload);
    } catch (err) {
        console.error('Error fetching timeline data:', err);
        res.status(500).json({ message: err.message });
    }
});

// Backward-compatible route for explicit userId paths.
router.get('/timeline/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify user can only access their own data
        if (userId !== req.userId && userId !== req.userId.toString()) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        const payload = await buildTimelinePayload(userId, req.query.days);
        res.json(payload);
    } catch (err) {
        console.error('Error fetching timeline data:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
