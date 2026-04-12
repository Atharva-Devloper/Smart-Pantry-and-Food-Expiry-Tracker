const mongoose = require('mongoose');
const dotenv = require('dotenv');
const WasteLog = require('./models/WasteLog');
const { User, PantryItem, CalorieTracker } = require('./models');
const { calculateNutrition } = require('./utils/nutritionDatabase');

dotenv.config();

const MONGODB_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/smart-pantry';

// Test user credentials
const TEST_USER = {
  name: 'Demo User',
  email: 'test@demo.com',
  password: 'testdemo123',
};

const categories = [
  'fruits',
  'vegetables',
  'dairy',
  'meat',
  'grains',
  'snacks',
  'beverages',
  'condiments',
  'frozen',
];

const foodItems = {
  fruits: ['Apples', 'Bananas', 'Oranges', 'Strawberries', 'Grapes', 'Mangoes'],
  vegetables: [
    'Broccoli',
    'Carrots',
    'Spinach',
    'Tomatoes',
    'Lettuce',
    'Cucumbers',
  ],
  dairy: ['Milk', 'Yogurt', 'Cheese', 'Butter', 'Cream'],
  meat: ['Chicken Breast', 'Ground Beef', 'Turkey', 'Pork Chops'],
  grains: ['Bread', 'Rice', 'Pasta', 'Cereal'],
  snacks: ['Chips', 'Cookies', 'Granola', 'Nuts'],
  beverages: ['Juice', 'Coffee', 'Tea', 'Soda'],
  condiments: ['Ketchup', 'Mustard', 'Olive Oil', 'Vinegar'],
  frozen: ['Frozen Vegetables', 'Frozen Pizza', 'Ice Cream', 'Frozen Berries'],
};

const reasons = ['expired', 'spoiled', 'over-purchased', 'other'];

const locations = ['fridge', 'freezer', 'pantry', 'cupboard'];

// Generate pantry items (products)
const generatePantryItems = (userId) => {
  const items = [];

  categories.forEach((category) => {
    // Add 2-3 items per category
    const itemsPerCategory = Math.floor(Math.random() * 2) + 2;

    for (let i = 0; i < itemsPerCategory; i++) {
      const foodName =
        foodItems[category][
          Math.floor(Math.random() * foodItems[category].length)
        ];
      const quantity = Math.floor(Math.random() * 8) + 1; // 1-8 units
      const daysUntilExpiry = Math.floor(Math.random() * 28) + 1; // 1-28 days

      // Calculate nutrition data
      const nutrition = calculateNutrition(foodName, 1, 'pieces');

      items.push({
        name: foodName,
        quantity: quantity,
        expiryDate: new Date(
          Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000
        ),
        category: category,
        location: locations[Math.floor(Math.random() * locations.length)],
        userId: new mongoose.Types.ObjectId(userId),
        notes: `Demo pantry item - ${quantity} units of ${foodName}`,
        nutrition: nutrition || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
          servingSize: 1,
          servingUnit: 'pieces'
        }
      });
    }
  });

  return items;
};

// Generate waste logs for the last 30 days with realistic distribution
const generateWasteLogs = (userId) => {
  const logs = [];
  const today = new Date();

  // Create 2-4 waste entries per day for the last 30 days
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const entriesForDay = Math.floor(Math.random() * 3) + 2; // 2-4 entries per day

    for (let i = 0; i < entriesForDay; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      // Random time during the day
      date.setHours(
        Math.floor(Math.random() * 24),
        Math.floor(Math.random() * 60),
        0,
        0
      );

      const category =
        categories[Math.floor(Math.random() * categories.length)];
      const foodName =
        foodItems[category][
          Math.floor(Math.random() * foodItems[category].length)
        ];

      logs.push({
        name: foodName,
        category: category,
        quantity: Math.floor(Math.random() * 5) + 1, // 1-5 units wasted
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        estimatedValue: parseFloat((Math.random() * 20 + 2).toFixed(2)), // $2-$22 value
        userId: new mongoose.Types.ObjectId(userId),
        loggedAt: date,
      });
    }
  }

  return logs;
};

// Generate sample calorie tracker data for the last 7 days
const generateCalorieTrackerData = async (userId) => {
  const trackerData = [];
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    date.setHours(12, 0, 0, 0); // Set to noon

    const meals = [
      {
        type: 'breakfast',
        items: [
          {
            name: 'Cereal',
            quantity: 50,
            unit: 'grams',
            calories: 190,
            protein: 5.0,
            carbs: 40,
            fat: 1.3,
            fiber: 3.3,
            sugar: 7.5,
            sodium: 290,
            pantryItemId: null
          },
          {
            name: 'Milk',
            quantity: 250,
            unit: 'grams',
            calories: 105,
            protein: 8.5,
            carbs: 12.5,
            fat: 2.5,
            fiber: 0,
            sugar: 12.5,
            sodium: 110,
            pantryItemId: null
          }
        ],
        totalCalories: 295
      },
      {
        type: 'lunch',
        items: [
          {
            name: 'Chicken Breast',
            quantity: 150,
            unit: 'grams',
            calories: 248,
            protein: 46.5,
            carbs: 0,
            fat: 5.4,
            fiber: 0,
            sugar: 0,
            sodium: 111,
            pantryItemId: null
          },
          {
            name: 'Rice',
            quantity: 100,
            unit: 'grams',
            calories: 130,
            protein: 2.7,
            carbs: 28,
            fat: 0.3,
            fiber: 0.4,
            sugar: 0.1,
            sodium: 1,
            pantryItemId: null
          },
          {
            name: 'Broccoli',
            quantity: 100,
            unit: 'grams',
            calories: 34,
            protein: 2.8,
            carbs: 7,
            fat: 0.4,
            fiber: 2.6,
            sugar: 1.5,
            sodium: 33,
            pantryItemId: null
          }
        ],
        totalCalories: 412
      },
      {
        type: 'dinner',
        items: [
          {
            name: 'Ground Beef',
            quantity: 100,
            unit: 'grams',
            calories: 250,
            protein: 26,
            carbs: 0,
            fat: 15,
            fiber: 0,
            sugar: 0,
            sodium: 72,
            pantryItemId: null
          },
          {
            name: 'Pasta',
            quantity: 80,
            unit: 'grams',
            calories: 105,
            protein: 4.0,
            carbs: 20,
            fat: 0.9,
            fiber: 1.4,
            sugar: 0.5,
            sodium: 5,
            pantryItemId: null
          },
          {
            name: 'Tomatoes',
            quantity: 100,
            unit: 'grams',
            calories: 18,
            protein: 0.9,
            carbs: 3.9,
            fat: 0.2,
            fiber: 1.2,
            sugar: 2.6,
            sodium: 5,
            pantryItemId: null
          }
        ],
        totalCalories: 373
      },
      {
        type: 'snack',
        items: [
          {
            name: 'Apples',
            quantity: 150,
            unit: 'grams',
            calories: 78,
            protein: 0.5,
            carbs: 21,
            fat: 0.3,
            fiber: 3.6,
            sugar: 15.6,
            sodium: 2,
            pantryItemId: null
          },
          {
            name: 'Nuts',
            quantity: 30,
            unit: 'grams',
            calories: 182,
            protein: 6.0,
            carbs: 6.3,
            fat: 16.2,
            fiber: 2.1,
            sugar: 1.3,
            sodium: 0,
            pantryItemId: null
          }
        ],
        totalCalories: 260
      }
    ];

    const totalDailyCalories = meals.reduce((sum, meal) => sum + meal.totalCalories, 0);
    const totalProtein = meals.reduce((sum, meal) => 
      sum + meal.items.reduce((mealSum, item) => mealSum + item.protein, 0), 0);
    const totalCarbs = meals.reduce((sum, meal) => 
      sum + meal.items.reduce((mealSum, item) => mealSum + item.carbs, 0), 0);
    const totalFat = meals.reduce((sum, meal) => 
      sum + meal.items.reduce((mealSum, item) => mealSum + item.fat, 0), 0);
    const totalFiber = meals.reduce((sum, meal) => 
      sum + meal.items.reduce((mealSum, item) => mealSum + item.fiber, 0), 0);
    const totalSugar = meals.reduce((sum, meal) => 
      sum + meal.items.reduce((mealSum, item) => mealSum + item.sugar, 0), 0);
    const totalSodium = meals.reduce((sum, meal) => 
      sum + meal.items.reduce((mealSum, item) => mealSum + item.sodium, 0), 0);

    trackerData.push({
      userId: new mongoose.Types.ObjectId(userId),
      date: date,
      meals: meals,
      totalDailyCalories: totalDailyCalories,
      totalProtein: Math.round(totalProtein * 10) / 10,
      totalCarbs: Math.round(totalCarbs * 10) / 10,
      totalFat: Math.round(totalFat * 10) / 10,
      totalFiber: Math.round(totalFiber * 10) / 10,
      totalSugar: Math.round(totalSugar * 10) / 10,
      totalSodium: Math.round(totalSodium),
      waterIntake: Math.floor(Math.random() * 1000) + 1500, // 1500-2500ml
      notes: dayOffset === 0 ? 'Today\'s meals - feeling good!' : `Sample day ${dayOffset + 1} data`
    });
  }

  return trackerData;
};

const seedWasteData = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
    });
    console.log('✅ Connected to MongoDB');

    // Create or find test user
    console.log('👤 Setting up test user account...');
    let testUser = await User.findOne({ email: TEST_USER.email });

    if (!testUser) {
      console.log(`   Creating new test user: ${TEST_USER.email}`);
      testUser = await User.create(TEST_USER);
      console.log('   ✅ Test user created');
    } else {
      console.log(`   ✅ Found existing test user: ${TEST_USER.email}`);
    }

    const userId = testUser._id;

    // Clear existing data for this user
    console.log('?? Clearing existing data for test user...');
    await PantryItem.deleteMany({ userId });
    await WasteLog.deleteMany({ userId });
    await CalorieTracker.deleteMany({ userId });

    // Generate and insert pantry items
    const pantryItems = generatePantryItems(userId);
    console.log(` Inserting ${pantryItems.length} pantry items...`);
    await PantryItem.insertMany(pantryItems);
    console.log(' Pantry items seeded successfully!');

    // Generate and insert waste logs
    const wasteLogs = generateWasteLogs(userId);
    console.log(` Inserting ${wasteLogs.length} waste log entries...`);
    await WasteLog.insertMany(wasteLogs);
    console.log(' Waste data seeded successfully!');

    // Generate and insert calorie tracker data
    const calorieTrackerData = await generateCalorieTrackerData(userId);
    console.log(` Inserting ${calorieTrackerData.length} days of calorie tracking data...`);
    await CalorieTracker.insertMany(calorieTrackerData);
    console.log(' Calorie tracker data seeded successfully!');

    // Display summary
    const wasteByCategory = await WasteLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$estimatedValue' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const pantryByCategory = await PantryItem.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log('\n📈 Demo Data Summary:');
    console.log(`User ID: ${userId}\n`);

    console.log('🛒 Pantry Items by Category:');
    pantryByCategory.forEach((cat) => {
      console.log(
        `   📦 ${cat._id}: ${cat.count} items, ${cat.totalQuantity} units`
      );
    });

    console.log('\n🗑️  Waste Logs by Category:');
    wasteByCategory.forEach((cat) => {
      console.log(
        `   📦 ${cat._id}: ${cat.count} items, ${cat.totalQuantity} units, $${cat.totalValue.toFixed(2)}`
      );
    });

    console.log('\n🎯 Test Account Credentials:');
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}`);
    console.log(
      '\n💡 Login and visit Products page to see pantry items, Waste page to see historical data!'
    );

    await mongoose.connection.close();
    console.log('\n✨ Seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  }
};

seedWasteData();
