const mongoose = require('mongoose');
const dotenv = require('dotenv');
const WasteLog = require('./models/WasteLog');
const { User, PantryItem, CalorieTracker } = require('./models');

dotenv.config();

const MONGODB_URI =
    process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Missing required environment variable: MONGODB_URI');
}

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

const unitDefaultsByCategory = {
    fruits: ['units', 'g'],
    vegetables: ['units', 'g'],
    dairy: ['g', 'ml', 'pack'],
    meat: ['g', 'kg', 'pack'],
    grains: ['g', 'kg', 'pack', 'box'],
    snacks: ['g', 'pack', 'box'],
    beverages: ['ml', 'l', 'bottle', 'can'],
    condiments: ['ml', 'g', 'bottle'],
    frozen: ['g', 'kg', 'pack', 'box'],
};

const preferredLocationsByCategory = {
    fruits: ['fridge', 'pantry'],
    vegetables: ['fridge'],
    dairy: ['fridge'],
    meat: ['freezer', 'fridge'],
    grains: ['pantry', 'cupboard'],
    snacks: ['pantry', 'cupboard'],
    beverages: ['pantry', 'fridge'],
    condiments: ['pantry', 'fridge'],
    frozen: ['freezer'],
};

const productProfileOverrides = {
    Milk: { units: ['l', 'ml'], valuePerBaseUnit: 0.0025 },
    Yogurt: { units: ['g', 'pack'], valuePerBaseUnit: 0.008 },
    Cheese: { units: ['g', 'pack'], valuePerBaseUnit: 0.015 },
    Butter: { units: ['g', 'pack'], valuePerBaseUnit: 0.012 },
    Cream: { units: ['ml'], valuePerBaseUnit: 0.006 },
    Bread: { units: ['pack', 'units'], valuePerBaseUnit: 1.8 },
    Rice: { units: ['kg', 'g'], valuePerBaseUnit: 0.002 },
    Pasta: { units: ['g', 'pack'], valuePerBaseUnit: 0.0022 },
    Cereal: { units: ['g', 'box'], valuePerBaseUnit: 0.0045 },
    Coffee: { units: ['g'], valuePerBaseUnit: 0.02 },
    Tea: { units: ['pack', 'box'], valuePerBaseUnit: 0.15 },
    Soda: { units: ['can', 'l'], valuePerBaseUnit: 0.9 },
    Juice: { units: ['ml', 'l', 'bottle'], valuePerBaseUnit: 0.003 },
    Ketchup: { units: ['ml', 'bottle'], valuePerBaseUnit: 0.0032 },
    Mustard: { units: ['ml', 'bottle'], valuePerBaseUnit: 0.004 },
    'Olive Oil': { units: ['ml', 'l', 'bottle'], valuePerBaseUnit: 0.01 },
    Vinegar: { units: ['ml', 'bottle'], valuePerBaseUnit: 0.0028 },
    'Chicken Breast': { units: ['g', 'kg', 'pack'], valuePerBaseUnit: 0.009 },
    'Ground Beef': { units: ['g', 'kg', 'pack'], valuePerBaseUnit: 0.011 },
    Turkey: { units: ['g', 'kg', 'pack'], valuePerBaseUnit: 0.01 },
    'Pork Chops': { units: ['g', 'kg', 'pack'], valuePerBaseUnit: 0.01 },
    'Frozen Pizza': { units: ['units', 'box'], valuePerBaseUnit: 4.5 },
    'Frozen Vegetables': { units: ['g', 'pack'], valuePerBaseUnit: 0.004 },
    'Frozen Berries': { units: ['g', 'pack'], valuePerBaseUnit: 0.009 },
    'Ice Cream': { units: ['ml', 'l', 'box'], valuePerBaseUnit: 0.0065 },
};

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const roundTo = (value, decimals = 2) => {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};

const quantityRangeByUnit = {
    units: { min: 1, max: 12, step: 1 },
    pack: { min: 1, max: 6, step: 1 },
    bottle: { min: 1, max: 4, step: 1 },
    can: { min: 1, max: 8, step: 1 },
    box: { min: 1, max: 4, step: 1 },
    g: { min: 100, max: 1500, step: 25 },
    kg: { min: 0.5, max: 5, step: 0.1 },
    ml: { min: 100, max: 3000, step: 50 },
    l: { min: 0.5, max: 4, step: 0.1 },
    oz: { min: 2, max: 80, step: 1 },
    lb: { min: 0.5, max: 10, step: 0.5 },
    cups: { min: 1, max: 12, step: 0.5 },
    tbsp: { min: 1, max: 24, step: 0.5 },
    tsp: { min: 1, max: 36, step: 1 },
};

const discreteUnits = new Set(['units', 'pack', 'bottle', 'can', 'box']);

const generateQuantityForUnit = (unit, scale = 1) => {
    const range = quantityRangeByUnit[unit] || quantityRangeByUnit.units;
    let min = range.min * scale;
    let max = range.max * scale;

    if (discreteUnits.has(unit)) {
        min = Math.max(1, Math.ceil(min));
        max = Math.max(min, Math.ceil(max));
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    min = Math.max(range.step, min);
    max = Math.max(min, max);
    const steps = Math.floor((max - min) / range.step);
    const value = min + (Math.floor(Math.random() * (steps + 1)) * range.step);
    return Number.isInteger(range.step) ? Math.round(value) : roundTo(value, 2);
};

const getProductProfile = (foodName, category) => {
    const override = productProfileOverrides[foodName] || {};
    return {
        units: override.units || unitDefaultsByCategory[category] || ['units'],
        valuePerBaseUnit: override.valuePerBaseUnit || 0.5,
    };
};

const estimateValue = (quantity, unit, valuePerBaseUnit) => {
    const baseMultipliers = {
        units: 1,
        pack: 2,
        bottle: 2,
        can: 1,
        box: 3,
        g: 1,
        kg: 1000,
        ml: 1,
        l: 1000,
        oz: 28.3495,
        lb: 453.592,
        cups: 240,
        tbsp: 15,
        tsp: 5,
    };
    const multiplier = baseMultipliers[unit] || 1;
    return roundTo(quantity * multiplier * valuePerBaseUnit, 2);
};

// Generate pantry items (products)
const generatePantryItems = (userId) => {
    const items = [];
    const userObjectId = new mongoose.Types.ObjectId(userId);

    categories.forEach((category) => {
        // Add 2-3 items per category
        const itemsPerCategory = Math.floor(Math.random() * 2) + 2;

        for (let i = 0; i < itemsPerCategory; i++) {
            const foodName =
                foodItems[category][
                Math.floor(Math.random() * foodItems[category].length)
                ];
            const profile = getProductProfile(foodName, category);
            const quantityUnit = pickRandom(profile.units);
            const quantity = generateQuantityForUnit(quantityUnit, 1);
            const daysUntilExpiry = Math.floor(Math.random() * 28) + 1; // 1-28 days
            const locationsForCategory = preferredLocationsByCategory[category] || locations;

            items.push({
                name: foodName,
                quantity: quantity,
                quantityUnit,
                expiryDate: new Date(
                    Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000
                ),
                category: category,
                location: pickRandom(locationsForCategory),
                userId: userObjectId,
                addedBy: userObjectId,
                notes: `Demo pantry item - ${quantity} ${quantityUnit} of ${foodName}`,
            });
        }
    });

    return items;
};

// Generate waste logs for the last 30 days with realistic distribution
const generateWasteLogs = (userId) => {
    const logs = [];
    const today = new Date();
    const userObjectId = new mongoose.Types.ObjectId(userId);

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
            const profile = getProductProfile(foodName, category);
            const quantityUnit = pickRandom(profile.units);
            const quantity = generateQuantityForUnit(quantityUnit, 0.35);
            const estimatedValue = estimateValue(
                quantity,
                quantityUnit,
                profile.valuePerBaseUnit
            );

            logs.push({
                name: foodName,
                category: category,
                quantity,
                quantityUnit,
                reason: reasons[Math.floor(Math.random() * reasons.length)],
                estimatedValue,
                userId: userObjectId,
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
            // Re-apply demo credentials so login always works after seeding.
            testUser.name = TEST_USER.name;
            testUser.password = TEST_USER.password;
            await testUser.save();
            console.log('   ✅ Demo user credentials refreshed');
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

        console.log('ℹ️  Calorie tracker preset data skipped (inventory-driven logging only).');

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
                    _id: { category: '$category', unit: '$quantityUnit' },
                    count: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' },
                },
            },
            { $sort: { '_id.category': 1, '_id.unit': 1 } },
        ]);

        const wasteByCategoryAndUnit = await WasteLog.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: { category: '$category', unit: '$quantityUnit' },
                    count: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' },
                    totalValue: { $sum: '$estimatedValue' },
                },
            },
            { $sort: { '_id.category': 1, '_id.unit': 1 } },
        ]);

        console.log('\n📈 Demo Data Summary:');
        console.log(`User ID: ${userId}\n`);

        console.log('🛒 Pantry Items by Category:');
        pantryByCategory.forEach((cat) => {
            console.log(
                `   📦 ${cat._id.category} (${cat._id.unit}): ${cat.count} items, ${roundTo(cat.totalQuantity, 2)} ${cat._id.unit}`
            );
        });

        console.log('\n🗑️  Waste Logs by Category:');
        wasteByCategory.forEach((cat) => {
            console.log(
                `   📦 ${cat._id}: ${cat.count} items, ${roundTo(cat.totalQuantity, 2)} total quantity, $${cat.totalValue.toFixed(2)}`
            );
        });

        console.log('\n⚖️  Waste by Category + Unit:');
        wasteByCategoryAndUnit.forEach((cat) => {
            console.log(
                `   📦 ${cat._id.category} (${cat._id.unit}): ${cat.count} logs, ${roundTo(cat.totalQuantity, 2)} ${cat._id.unit}, $${cat.totalValue.toFixed(2)}`
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
