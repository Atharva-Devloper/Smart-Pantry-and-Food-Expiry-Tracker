const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CalorieTracker = require('../models/CalorieTracker');
const PantryItem = require('../models/PantryItem');
const { estimateConsumedNutrition, estimateMealNutrition } = require('../utils/groq');

const mealTypes = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

const roundTo2 = (value) => Math.round(value * 100) / 100;

const getCalorieNotification = ({ estimateSource, calories, quantity, unit, name }) => {
    const qtyText = roundTo2(quantity);
    const map = {
        groq: `Estimated: ${calories} kcal for ${qtyText} ${unit} of ${name}.`,
        fallback: `Estimated (fallback): ${calories} kcal for ${qtyText} ${unit} of ${name}.`,
        none: `No estimate for ${qtyText} ${unit} of ${name}.`,
    };
    return map[estimateSource] || `Estimate: ${calories} kcal for ${qtyText} ${unit} of ${name}.`;
};

const applyMealConsumption = async ({ userId, date, mealType, items }) => {
    if (!mealTypes.has(mealType)) {
        throw new Error('Invalid meal type');
    }

    const normalizedItems = (Array.isArray(items) ? items : [])
        .map((item) => ({
            pantryItemId: String(item?.pantryItemId || '').trim(),
            consumedQuantity: Number(item?.consumedQuantity),
        }))
        .filter(
            (item) => item.pantryItemId && Number.isFinite(item.consumedQuantity) && item.consumedQuantity > 0
        );

    if (normalizedItems.length === 0) {
        throw new Error('At least one consumed item is required');
    }

    const pantryIds = [...new Set(normalizedItems.map((item) => item.pantryItemId))];

    // Get user's current family for pantry items
    const User = require('../models/User');
    const user = await User.findById(userId).select('currentFamilyId');
    const currentFamilyId = user?.currentFamilyId;

    if (!currentFamilyId) {
        throw new Error('User must be part of a family to track calories');
    }

    const pantryDocs = await PantryItem.find({
        _id: { $in: pantryIds },
        familyId: currentFamilyId,
    });

    const pantryById = new Map(pantryDocs.map((item) => [String(item._id), item]));
    const requestedById = new Map();
    for (const item of normalizedItems) {
        const prev = requestedById.get(item.pantryItemId) || 0;
        requestedById.set(item.pantryItemId, prev + item.consumedQuantity);
    }

    for (const [pantryId, requestedQty] of requestedById.entries()) {
        const pantryItem = pantryById.get(pantryId);
        if (!pantryItem) {
            throw new Error('One or more pantry items were not found');
        }
        if (requestedQty > pantryItem.quantity) {
            throw new Error(
                `Consumed quantity exceeds available inventory for ${pantryItem.name} (${pantryItem.quantity} ${pantryItem.quantityUnit})`
            );
        }
    }

    const estimationInput = normalizedItems.map((item) => {
        const pantryItem = pantryById.get(item.pantryItemId);
        return {
            foodName: pantryItem.name,
            quantity: item.consumedQuantity,
            unit: pantryItem.quantityUnit,
        };
    });

    const nutritionEstimates =
        normalizedItems.length === 1
            ? [
                await estimateConsumedNutrition(
                    estimationInput[0].foodName,
                    estimationInput[0].quantity,
                    estimationInput[0].unit
                ),
            ]
            : await estimateMealNutrition(estimationInput);

    const calorieTracker = await findOrCreateTrackerForDate(userId, date || new Date());
    const existingMealIndex = calorieTracker.meals.findIndex((meal) => meal.type === mealType);

    const notifications = [];
    const loggedItems = normalizedItems.map((item, index) => {
        const pantryItem = pantryById.get(item.pantryItemId);
        const nutrition = nutritionEstimates[index] || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            estimateSource: 'none',
        };

        const estimateSource = nutrition.estimateSource || 'fallback';
        const notification = getCalorieNotification({
            estimateSource,
            calories: nutrition.calories,
            quantity: item.consumedQuantity,
            unit: pantryItem.quantityUnit,
            name: pantryItem.name,
        });
        notifications.push(notification);
        console.info(`[CalorieTracker] ${notification}`);

        return {
            name: pantryItem.name,
            quantity: roundTo2(item.consumedQuantity),
            unit: pantryItem.quantityUnit,
            calories: nutrition.calories,
            protein: nutrition.protein,
            carbs: nutrition.carbs,
            fat: nutrition.fat,
            fiber: nutrition.fiber,
            sugar: nutrition.sugar,
            sodium: nutrition.sodium,
            pantryItemId: pantryItem._id,
            estimateSource,
        };
    });

    if (existingMealIndex !== -1) {
        calorieTracker.meals[existingMealIndex].items.push(...loggedItems);
    } else {
        calorieTracker.meals.push({
            type: mealType,
            items: loggedItems,
        });
    }

    const updatedItems = [];
    const removedIds = [];
    for (const [pantryId, requestedQty] of requestedById.entries()) {
        const pantryItem = pantryById.get(pantryId);
        pantryItem.quantity = roundTo2(pantryItem.quantity - requestedQty);
        if (pantryItem.quantity <= 0) {
            await PantryItem.findByIdAndDelete(pantryItem._id);
            removedIds.push(pantryItem._id);
        } else {
            await pantryItem.save();
            updatedItems.push(pantryItem);
        }
    }

    await calorieTracker.save();
    await calorieTracker.populate('meals.items.pantryItemId');

    const mealCalories = roundTo2(
        loggedItems.reduce((sum, item) => sum + Number(item.calories || 0), 0)
    );

    return {
        tracker: calorieTracker,
        inventoryUpdate: {
            removedIds,
            updatedItems,
        },
        notifications,
        mealSummary: {
            mealType,
            ingredientCount: loggedItems.length,
            totalMealCalories: mealCalories,
        },
    };
};

const getDayRange = (dateValue) => {
    const date = new Date(dateValue);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return { startOfDay, endOfDay };
};

const findOrCreateTrackerForDate = async (userId, dateValue) => {
    const { startOfDay, endOfDay } = getDayRange(dateValue);

    let tracker = await CalorieTracker.findOne({
        userId: userId, // Reverted back to userId-based logic
        date: { $gte: startOfDay, $lte: endOfDay },
    }).populate('meals.items.pantryItemId');

    if (!tracker) {
        tracker = new CalorieTracker({
            userId: userId, // Reverted back to userId-based logic
            date: startOfDay,
            meals: [],
        });
        await tracker.save();
        await tracker.populate('meals.items.pantryItemId');
    }

    return tracker;
};

// Get calorie tracker for a specific date
router.get('/date/:date', auth, async (req, res) => {
    try {
        const tracker = await findOrCreateTrackerForDate(req.userId, req.params.date);
        res.json(tracker);
    } catch (error) {
        console.error('Error fetching calorie tracker:', error);
        res.status(500).json({ error: 'Failed to fetch calorie tracker' });
    }
});

// Get calorie tracker for today
router.get('/today', auth, async (req, res) => {
    try {
        const tracker = await findOrCreateTrackerForDate(req.userId, new Date());
        res.json(tracker);
    } catch (error) {
        console.error('Error fetching today\'s calorie tracker:', error);
        res.status(500).json({ error: 'Failed to fetch today\'s calorie tracker' });
    }
});

// Get calorie history for a date range
router.get('/history', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);

        const calorieHistory = await CalorieTracker.find({
            userId: req.userId, // Reverted back to userId-based logic
            date: {
                $gte: start,
                $lte: end
            }
        }).sort({ date: 1 });

        res.json(calorieHistory);
    } catch (error) {
        console.error('Error fetching calorie history:', error);
        res.status(500).json({ error: 'Failed to fetch calorie history' });
    }
});

// Consume pantry inventory item and log it in calorie tracker
router.post('/consume', auth, async (req, res) => {
    try {
        const { date, mealType, pantryItemId, consumedQuantity } = req.body;
        const result = await applyMealConsumption({
            userId: req.userId,
            date,
            mealType,
            items: [{ pantryItemId, consumedQuantity }],
        });

        const firstLoggedItem = result.tracker.meals
            .find((meal) => meal.type === mealType)
            ?.items?.slice(-1)[0];

        res.json({
            tracker: result.tracker,
            inventoryUpdate: result.inventoryUpdate,
            calorieNotification: result.notifications[0] || 'Consumption logged.',
            estimateSource: firstLoggedItem?.estimateSource || 'fallback',
            estimatedCalories: firstLoggedItem?.calories || 0,
            notifications: result.notifications,
            mealSummary: result.mealSummary,
        });
    } catch (error) {
        console.error('Error logging consumed inventory item:', error);
        res.status(400).json({ error: error.message || 'Failed to log consumed item' });
    }
});

// Consume multiple pantry items and log as one meal action
router.post('/consume-batch', auth, async (req, res) => {
    try {
        const { date, mealType, items } = req.body;
        const result = await applyMealConsumption({
            userId: req.userId,
            date,
            mealType,
            items,
        });

        res.json(result);
    } catch (error) {
        console.error('Error logging batch consumed inventory items:', error);
        res.status(400).json({ error: error.message || 'Failed to log consumed meal' });
    }
});

// Update water intake
router.put('/water', auth, async (req, res) => {
    try {
        const { date, waterIntake } = req.body;

        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        let calorieTracker = await CalorieTracker.findOne({
            userId: req.userId, // Reverted back to userId-based logic
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        if (!calorieTracker) {
            calorieTracker = new CalorieTracker({
                userId: req.userId, // Reverted back to userId-based logic
                date: targetDate,
                meals: [],
                waterIntake: waterIntake,
            });
        } else {
            calorieTracker.waterIntake = waterIntake;
        }

        await calorieTracker.save();

        res.json({ waterIntake: calorieTracker.waterIntake });
    } catch (error) {
        console.error('Error updating water intake:', error);
        res.status(500).json({ error: 'Failed to update water intake' });
    }
});

// Update notes for the day
router.put('/notes', auth, async (req, res) => {
    try {
        const { date, notes } = req.body;

        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        let calorieTracker = await CalorieTracker.findOne({
            userId: req.userId, // Reverted back to userId-based logic
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        if (!calorieTracker) {
            calorieTracker = new CalorieTracker({
                userId: req.userId, // Reverted back to userId-based logic
                date: targetDate,
                meals: [],
                notes: notes,
            });
        } else {
            calorieTracker.notes = notes;
        }

        await calorieTracker.save();

        res.json({ notes: calorieTracker.notes });
    } catch (error) {
        console.error('Error updating notes:', error);
        res.status(500).json({ error: 'Failed to update notes' });
    }
});

// Delete meal item
router.delete('/meal/:date/:mealType/:itemIndex', auth, async (req, res) => {
    try {
        const { date, mealType, itemIndex } = req.params;

        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const calorieTracker = await CalorieTracker.findOne({
            userId: req.userId, // Reverted back to userId-based logic
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        if (!calorieTracker) {
            return res.status(404).json({ error: 'Calorie tracker not found' });
        }

        const meal = calorieTracker.meals.find(meal => meal.type === mealType);
        if (!meal) {
            return res.status(404).json({ error: 'Meal not found' });
        }

        const index = parseInt(itemIndex);
        if (index < 0 || index >= meal.items.length) {
            return res.status(400).json({ error: 'Invalid item index' });
        }

        meal.items.splice(index, 1);
        await calorieTracker.save();
        await calorieTracker.populate('meals.items.pantryItemId');

        res.json(calorieTracker);
    } catch (error) {
        console.error('Error deleting meal item:', error);
        res.status(500).json({ error: 'Failed to delete meal item' });
    }
});

// Get pantry items for meal creation
router.get('/pantry-items', auth, async (req, res) => {
    try {
        // Get user's current family for pantry items
        const User = require('../models/User');
        const user = await User.findById(req.userId).select('currentFamilyId');
        const currentFamilyId = user?.currentFamilyId;

        const pantryItems = await PantryItem.find({
            familyId: currentFamilyId,
            status: { $in: ['fresh', 'expiring'] },
            quantity: { $gt: 0 },
        }).sort({ name: 1 });

        res.json(pantryItems);
    } catch (error) {
        console.error('Error fetching pantry items:', error);
        res.status(500).json({ error: 'Failed to fetch pantry items' });
    }
});

// Get calorie statistics
router.get('/stats', auth, async (req, res) => {
    try {
        const { period = 'week' } = req.query;
        const now = new Date();
        let startDate;

        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        const stats = await CalorieTracker.aggregate([
            {
                $match: {
                    userId: req.userId, // Reverted back to userId-based logic
                    date: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: null,
                    avgDailyCalories: { $avg: '$totalDailyCalories' },
                    totalCalories: { $sum: '$totalDailyCalories' },
                    avgProtein: { $avg: '$totalProtein' },
                    avgCarbs: { $avg: '$totalCarbs' },
                    avgFat: { $avg: '$totalFat' },
                    avgFiber: { $avg: '$totalFiber' },
                    avgSugar: { $avg: '$totalSugar' },
                    avgSodium: { $avg: '$totalSodium' },
                    avgWaterIntake: { $avg: '$waterIntake' },
                    daysTracked: { $sum: 1 }
                }
            }
        ]);

        const result = stats[0] || {
            avgDailyCalories: 0,
            totalCalories: 0,
            avgProtein: 0,
            avgCarbs: 0,
            avgFat: 0,
            avgFiber: 0,
            avgSugar: 0,
            avgSodium: 0,
            avgWaterIntake: 0,
            daysTracked: 0
        };

        res.json(result);
    } catch (error) {
        console.error('Error getting calorie stats:', error);
        res.status(500).json({ error: 'Failed to get calorie statistics' });
    }
});

module.exports = router;
