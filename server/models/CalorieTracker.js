const mongoose = require('mongoose');

const calorieTrackerSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
        },
        date: {
            type: Date,
            required: [true, 'Date is required'],
            default: Date.now,
        },
        meals: [{
            type: {
                type: String,
                enum: ['breakfast', 'lunch', 'dinner', 'snack'],
                required: true,
            },
            items: [{
                name: {
                    type: String,
                    required: true,
                    trim: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: [0, 'Quantity cannot be negative'],
                    default: 1,
                },
                unit: {
                    type: String,
                    enum: [
                        'units',
                        'g',
                        'kg',
                        'ml',
                        'l',
                        'oz',
                        'lb',
                        'cups',
                        'tbsp',
                        'tsp',
                        'pack',
                        'bottle',
                        'can',
                        'box',
                    ],
                    default: 'units',
                },
                calories: {
                    type: Number,
                    required: true,
                    min: [0, 'Calories cannot be negative'],
                },
                protein: {
                    type: Number,
                    min: [0, 'Protein cannot be negative'],
                    default: 0,
                },
                carbs: {
                    type: Number,
                    min: [0, 'Carbs cannot be negative'],
                    default: 0,
                },
                fat: {
                    type: Number,
                    min: [0, 'Fat cannot be negative'],
                    default: 0,
                },
                fiber: {
                    type: Number,
                    min: [0, 'Fiber cannot be negative'],
                    default: 0,
                },
                sugar: {
                    type: Number,
                    min: [0, 'Sugar cannot be negative'],
                    default: 0,
                },
                sodium: {
                    type: Number,
                    min: [0, 'Sodium cannot be negative'],
                    default: 0,
                },
                pantryItemId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'PantryItem',
                },
                estimateSource: {
                    type: String,
                    enum: ['groq', 'fallback', 'none'],
                    default: 'fallback',
                },
            }],
            totalCalories: {
                type: Number,
                default: 0,
            },
        }],
        totalDailyCalories: {
            type: Number,
            default: 0,
        },
        totalProtein: {
            type: Number,
            default: 0,
        },
        totalCarbs: {
            type: Number,
            default: 0,
        },
        totalFat: {
            type: Number,
            default: 0,
        },
        totalFiber: {
            type: Number,
            default: 0,
        },
        totalSugar: {
            type: Number,
            default: 0,
        },
        totalSodium: {
            type: Number,
            default: 0,
        },
        waterIntake: {
            type: Number,
            default: 0, // in milliliters
        },
        notes: {
            type: String,
            maxlength: [500, 'Notes cannot exceed 500 characters'],
            trim: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual for calculating daily calorie goal percentage
calorieTrackerSchema.virtual('calorieGoalPercentage').get(function () {
    const dailyGoal = 2000; // Default daily calorie goal
    return Math.round((this.totalDailyCalories / dailyGoal) * 100);
});

// Virtual for checking if daily calorie goal is met
calorieTrackerSchema.virtual('isCalorieGoalMet').get(function () {
    const dailyGoal = 2000; // Default daily calorie goal
    return this.totalDailyCalories >= dailyGoal;
});

// Pre-save middleware to calculate totals
calorieTrackerSchema.pre('save', function (next) {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    let totalSugar = 0;
    let totalSodium = 0;

    this.meals.forEach(meal => {
        let mealTotalCalories = 0;

        meal.items.forEach(item => {
            mealTotalCalories += item.calories;
            totalProtein += item.protein;
            totalCarbs += item.carbs;
            totalFat += item.fat;
            totalFiber += item.fiber;
            totalSugar += item.sugar;
            totalSodium += item.sodium;
        });

        meal.totalCalories = mealTotalCalories;
        totalCalories += mealTotalCalories;
    });

    this.totalDailyCalories = totalCalories;
    this.totalProtein = totalProtein;
    this.totalCarbs = totalCarbs;
    this.totalFat = totalFat;
    this.totalFiber = totalFiber;
    this.totalSugar = totalSugar;
    this.totalSodium = totalSodium;
});

// Indexes for better query performance
calorieTrackerSchema.index({ userId: 1, 'meals.type': 1 });

// Compound index for unique date per user
calorieTrackerSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('CalorieTracker', calorieTrackerSchema);
