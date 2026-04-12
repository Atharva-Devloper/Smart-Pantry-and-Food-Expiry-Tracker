const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CalorieTracker = require('../models/CalorieTracker');
const PantryItem = require('../models/PantryItem');
const { calculateNutrition, calculateQuantityDeduction } = require('../utils/nutritionDatabase');

// Get calorie tracker for a specific date
router.get('/date/:date', auth, async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);
    
    // Create date range for the specific day (start to end)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    let calorieTracker = await CalorieTracker.findOne({
      userId: req.userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).populate('meals.items.pantryItemId');

    if (!calorieTracker) {
      // Create a new calorie tracker for this date
      calorieTracker = new CalorieTracker({
        userId: req.userId,
        date: targetDate,
        meals: [],
        totalDailyCalories: 0,
      });
      await calorieTracker.save();
    }

    res.json(calorieTracker);
  } catch (error) {
    console.error('Error fetching calorie tracker:', error);
    res.status(500).json({ error: 'Failed to fetch calorie tracker' });
  }
});

// Get calorie tracker for today
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    let calorieTracker = await CalorieTracker.findOne({
      userId: req.userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).populate('meals.items.pantryItemId');

    if (!calorieTracker) {
      calorieTracker = new CalorieTracker({
        userId: req.userId,
        date: today,
        meals: [],
        totalDailyCalories: 0,
      });
      await calorieTracker.save();
    }

    res.json(calorieTracker);
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
      userId: req.userId,
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

// Add meal to calorie tracker
router.post('/meal', auth, async (req, res) => {
  try {
    const { date, mealType, items } = req.body;
    
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    let calorieTracker = await CalorieTracker.findOne({
      userId: req.userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (!calorieTracker) {
      calorieTracker = new CalorieTracker({
        userId: req.userId,
        date: targetDate,
        meals: [],
      });
    }

    // Process items and calculate nutrition, and deduct quantities from pantry
    const processedItems = [];
    
    for (const item of items) {
      let nutrition;
      let pantryItem = null;
      
      if (item.pantryItemId) {
        // Get pantry item and deduct quantity
        pantryItem = await PantryItem.findById(item.pantryItemId);
        
        if (pantryItem) {
          // Calculate equivalent quantity deduction
          const deductionAmount = calculateQuantityDeduction(item.quantity, item.unit, pantryItem.quantity, pantryItem.unit);
          
          if (deductionAmount > 0) {
            // Update pantry item quantity
            pantryItem.quantity = Math.max(0, pantryItem.quantity - deductionAmount);
            
            // Update status based on remaining quantity
            if (pantryItem.quantity === 0) {
              pantryItem.status = 'expired';
            } else if (pantryItem.quantity < parseFloat(pantryItem.quantity) * 0.2) {
              pantryItem.status = 'expiring';
            }
            
            await pantryItem.save();
          }
          
          // Use pantry item nutrition data
          nutrition = pantryItem.nutrition || calculateNutrition(item.name, item.quantity, item.unit);
        } else {
          // Use nutrition database if pantry item not found
          nutrition = calculateNutrition(item.name, item.quantity, item.unit);
        }
      } else {
        // Use nutrition database
        nutrition = calculateNutrition(item.name, item.quantity, item.unit);
      }

      processedItems.push({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        calories: nutrition?.calories || 0,
        protein: nutrition?.protein || 0,
        carbs: nutrition?.carbs || 0,
        fat: nutrition?.fat || 0,
        fiber: nutrition?.fiber || 0,
        sugar: nutrition?.sugar || 0,
        sodium: nutrition?.sodium || 0,
        pantryItemId: item.pantryItemId || null,
        originalQuantity: pantryItem ? pantryItem.quantity + calculateQuantityDeduction(item.quantity, item.unit, pantryItem.quantity, pantryItem.unit) : null,
        originalUnit: pantryItem ? pantryItem.unit : null,
      });
    }

    // Add or update meal
    const existingMealIndex = calorieTracker.meals.findIndex(meal => meal.type === mealType);
    
    if (existingMealIndex !== -1) {
      // Update existing meal
      calorieTracker.meals[existingMealIndex].items.push(...processedItems);
    } else {
      // Add new meal
      calorieTracker.meals.push({
        type: mealType,
        items: processedItems,
        totalCalories: processedItems.reduce((sum, item) => sum + item.calories, 0),
      });
    }

    await calorieTracker.save();
    await calorieTracker.populate('meals.items.pantryItemId');

    res.json(calorieTracker);
  } catch (error) {
    console.error('Error adding meal:', error);
    res.status(500).json({ error: 'Failed to add meal' });
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
      userId: req.userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (!calorieTracker) {
      calorieTracker = new CalorieTracker({
        userId: req.userId,
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
      userId: req.userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (!calorieTracker) {
      calorieTracker = new CalorieTracker({
        userId: req.userId,
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
      userId: req.userId,
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

// Search food items in nutrition database
router.get('/search-foods', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.json([]);
    }
    
    const results = searchFoodItems(query);
    res.json(results);
  } catch (error) {
    console.error('Error searching food items:', error);
    res.status(500).json({ error: 'Failed to search food items' });
  }
});

// Get pantry items for meal creation
router.get('/pantry-items', auth, async (req, res) => {
  try {
    const pantryItems = await PantryItem.find({ 
      userId: req.userId,
      status: { $in: ['fresh', 'expiring'] }
    }).sort({ name: 1 });
    
    res.json(pantryItems);
  } catch (error) {
    console.error('Error fetching pantry items:', error);
    res.status(500).json({ error: 'Failed to fetch pantry items' });
  }
});

// Get nutrition data for a specific food
router.get('/nutrition/:foodName', auth, async (req, res) => {
  try {
    const { foodName } = req.params;
    const nutrition = getNutritionData(foodName);
    
    if (!nutrition) {
      return res.status(404).json({ error: 'Food not found in database' });
    }

    res.json({ name: foodName, ...nutrition });
  } catch (error) {
    console.error('Error getting nutrition data:', error);
    res.status(500).json({ error: 'Failed to get nutrition data' });
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
          userId: req.userId,
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
