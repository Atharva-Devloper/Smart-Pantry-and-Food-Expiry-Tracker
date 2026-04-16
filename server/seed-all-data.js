const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { User, PantryItem, ShoppingItem, WasteLog, Family, CalorieTracker } = require('./models');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Missing required environment variable: MONGODB_URI');
}

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

const locations = ['fridge', 'freezer', 'pantry', 'cupboard'];

const generateSeedData = async () => {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 10,
        });
        console.log('✅ Connected to MongoDB');

        // Create or get test user
        let testUser = await User.findOne({ email: 'demo@smartpantry.com' });

        if (!testUser) {
            console.log('Creating demo user...');
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('demo123', 10);
            testUser = await User.create({
                name: 'Demo User',
                email: 'demo@smartpantry.com',
                password: hashedPassword,
            });
            console.log('✅ Demo user created (email: demo@smartpantry.com, password: demo123)');
        }

        // Create or get family
        let family = await Family.findOne({ 'members.userId': testUser._id });

        if (!family) {
            console.log('Creating demo family...');
            family = await Family.create({
                name: 'Demo Family',
                joinCode: 'DEMO123',
                members: [{
                    userId: testUser._id,
                    role: 'owner',
                    joinedAt: new Date()
                }]
            });

            testUser.currentFamilyId = family._id;
            await testUser.save();
            console.log('✅ Demo family created (join code: DEMO123)');
        }

        const userId = testUser._id;
        const familyId = family._id;

        // Clear existing data for this family
        console.log('🗑️ Clearing existing data...');
        await PantryItem.deleteMany({ familyId });
        await ShoppingItem.deleteMany({ familyId });
        await WasteLog.deleteMany({ familyId });
        await CalorieTracker.deleteMany({ userId });

        // Generate inventory items
        console.log('📦 Generating inventory items...');
        const inventoryItems = [];
        const foodItems = {
            fruits: ['Apples', 'Bananas', 'Oranges', 'Strawberries', 'Grapes'],
            vegetables: ['Lettuce', 'Tomatoes', 'Carrots', 'Broccoli', 'Spinach'],
            dairy: ['Milk', 'Yogurt', 'Cheese', 'Butter', 'Eggs'],
            meat: ['Chicken Breast', 'Ground Beef', 'Pork Chops', 'Turkey', 'Salmon'],
            grains: ['Bread', 'Rice', 'Pasta', 'Cereal', 'Oats'],
            snacks: ['Chips', 'Cookies', 'Granola Bars', 'Nuts', 'Crackers'],
            beverages: ['Orange Juice', 'Coffee', 'Tea', 'Soda', 'Water'],
            condiments: ['Ketchup', 'Mustard', 'Mayonnaise', 'Olive Oil', 'Soy Sauce'],
            frozen: ['Frozen Vegetables', 'Ice Cream', 'Frozen Pizza', 'Frozen Berries', 'Frozen Chicken']
        };

        for (const [category, items] of Object.entries(foodItems)) {
            items.forEach(item => {
                const today = new Date();
                const expiryDate = new Date(today);
                expiryDate.setDate(expiryDate.getDate() + Math.floor(Math.random() * 30) + 1);

                inventoryItems.push({
                    name: item,
                    category: category,
                    quantity: Math.floor(Math.random() * 10) + 1,
                    quantityUnit: ['units', 'g', 'ml', 'kg', 'l'][Math.floor(Math.random() * 5)],
                    expiryDate: expiryDate,
                    location: locations[Math.floor(Math.random() * locations.length)],
                    userId: userId,
                    familyId: familyId,
                    addedBy: userId,
                });
            });
        }

        await PantryItem.insertMany(inventoryItems);
        console.log(`✅ Added ${inventoryItems.length} inventory items`);

        // Generate shopping list items
        console.log('🛒 Generating shopping list items...');
        const shoppingItems = [];
        const shoppingList = [
            'Milk', 'Bread', 'Eggs', 'Butter', 'Chicken',
            'Rice', 'Pasta', 'Tomatoes', 'Onions', 'Garlic',
            'Cheese', 'Yogurt', 'Apples', 'Bananas', 'Spinach'
        ];

        shoppingList.forEach(item => {
            shoppingItems.push({
                name: item,
                quantity: Math.floor(Math.random() * 5) + 1,
                quantityUnit: ['units', 'g', 'ml', 'kg', 'l'][Math.floor(Math.random() * 5)],
                category: 'other',
                priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                isPurchased: false,
                userId: userId,
                familyId: familyId,
            });
        });

        await ShoppingItem.insertMany(shoppingItems);
        console.log(`✅ Added ${shoppingItems.length} shopping list items`);

        // Generate waste logs
        console.log('🗑️ Generating waste logs...');
        const wasteLogs = [];
        const reasons = ['expired', 'spoiled', 'over-purchased', 'other'];
        const today = new Date();

        for (let i = 0; i < 20; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));

            wasteLogs.push({
                name: foodItems.fruits[Math.floor(Math.random() * foodItems.fruits.length)],
                category: 'fruits',
                quantity: Math.floor(Math.random() * 500) + 50,
                quantityUnit: ['g', 'ml', 'units', 'pack'][Math.floor(Math.random() * 4)],
                reason: reasons[Math.floor(Math.random() * reasons.length)],
                estimatedValue: parseFloat((Math.random() * 10 + 1).toFixed(2)),
                userId: userId,
                familyId: familyId,
                loggedAt: date,
            });
        }

        await WasteLog.insertMany(wasteLogs);
        console.log(`✅ Added ${wasteLogs.length} waste logs`);

        // Generate calorie tracker entries
        console.log('🍎 Generating calorie tracker entries...');
        const calorieEntries = [];
        const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        const mealItems = {
            breakfast: ['Oatmeal', 'Eggs', 'Toast', 'Cereal', 'Yogurt'],
            lunch: ['Sandwich', 'Salad', 'Soup', 'Rice Bowl', 'Pasta'],
            dinner: ['Chicken', 'Fish', 'Steak', 'Pasta', 'Vegetables'],
            snack: ['Apple', 'Banana', 'Nuts', 'Yogurt', 'Crackers']
        };

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            const meals = mealTypes.map(mealType => ({
                type: mealType,
                items: mealItems[mealType].slice(0, Math.floor(Math.random() * 3) + 1).map(item => ({
                    name: item,
                    quantity: Math.floor(Math.random() * 3) + 1,
                    unit: ['units', 'g', 'ml'][Math.floor(Math.random() * 3)],
                    calories: Math.floor(Math.random() * 300) + 50,
                }))
            }));

            calorieEntries.push({
                userId: userId,
                date: date,
                meals: meals,
                totalCalories: meals.reduce((sum, meal) =>
                    sum + meal.items.reduce((itemSum, item) => itemSum + item.calories, 0), 0
                ),
            });
        }

        await CalorieTracker.insertMany(calorieEntries);
        console.log(`✅ Added ${calorieEntries.length} calorie tracker entries`);

        // Display summary
        console.log('\n📊 Seed Data Summary:');
        console.log(`User: ${testUser.name} (${testUser.email})`);
        console.log(`Password: demo123`);
        console.log(`Family: ${family.name} (Join Code: ${family.joinCode})`);
        console.log(`\nData Added:`);
        console.log(`  📦 Inventory Items: ${inventoryItems.length}`);
        console.log(`  🛒 Shopping List Items: ${shoppingItems.length}`);
        console.log(`  🗑️ Waste Logs: ${wasteLogs.length}`);
        console.log(`  🍎 Calorie Entries: ${calorieEntries.length}`);

        console.log('\n✅ All seed data created successfully!');
        console.log('💡 You can now login with: demo@smartpantry.com / demo123');

        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error creating seed data:', error.message);
        process.exit(1);
    }
};

generateSeedData();
