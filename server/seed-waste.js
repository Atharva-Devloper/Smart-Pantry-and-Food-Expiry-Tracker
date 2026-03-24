const mongoose = require('mongoose');
const dotenv = require('dotenv');
const WasteLog = require('./models/WasteLog');
const { User, PantryItem } = require('./models');

dotenv.config();

const MONGODB_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/smart_pantry';

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
    console.log('🗑️  Clearing existing data for test user...');
    await PantryItem.deleteMany({ userId });
    await WasteLog.deleteMany({ userId });

    // Generate and insert pantry items
    const pantryItems = generatePantryItems(userId);
    console.log(`📦 Inserting ${pantryItems.length} pantry items...`);
    await PantryItem.insertMany(pantryItems);
    console.log('✅ Pantry items seeded successfully!');

    // Generate and insert waste logs
    const wasteLogs = generateWasteLogs(userId);
    console.log(`📊 Inserting ${wasteLogs.length} waste log entries...`);
    await WasteLog.insertMany(wasteLogs);
    console.log('✅ Waste data seeded successfully!');

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
