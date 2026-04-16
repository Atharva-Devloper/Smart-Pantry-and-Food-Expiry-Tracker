const mongoose = require('mongoose');
const dotenv = require('dotenv');
const WasteLog = require('./models/WasteLog');
const { User, PantryItem } = require('./models');

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

const reasons = ['expired', 'spoiled', 'over-purchased', 'other'];

const generateWasteTestData = async () => {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 10,
        });
        console.log('✅ Connected to MongoDB');

        // Get a test user or create one
        let testUser = await User.findOne({ email: 'test@demo.com' });
        
        if (!testUser) {
            console.log('Creating test user...');
            testUser = await User.create({
                name: 'Test User',
                email: 'test@demo.com',
                password: 'testdemo123',
            });
            console.log('✅ Test user created');
        }

        // Get user's current family or create one
        const Family = require('./models/Family');
        let family = await Family.findOne({ 'members.userId': testUser._id });
        
        if (!family) {
            console.log('Creating test family...');
            family = await Family.create({
                name: 'Test Family',
                joinCode: 'TEST123',
                members: [{
                    userId: testUser._id,
                    role: 'owner',
                    joinedAt: new Date()
                }]
            });
            
            // Update user with family reference
            testUser.currentFamilyId = family._id;
            await testUser.save();
            console.log('✅ Test family created');
        }

        const userId = testUser._id;
        const familyId = family._id;

        // Clear existing waste data for this family
        console.log('🗑️ Clearing existing waste data...');
        await WasteLog.deleteMany({ familyId });

        // Generate diverse waste test data for the last 60 days
        const wasteData = [];
        const today = new Date();
        
        // Generate 3-5 waste entries per day for realistic data
        for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
            const entriesForDay = Math.floor(Math.random() * 3) + 3; // 3-5 entries per day

            for (let i = 0; i < entriesForDay; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - dayOffset);
                date.setHours(
                    Math.floor(Math.random() * 24),
                    Math.floor(Math.random() * 60),
                    0,
                    0
                );

                const category = categories[Math.floor(Math.random() * categories.length)];
                const foodItems = {
                    fruits: ['Apples', 'Bananas', 'Oranges', 'Strawberries'],
                    vegetables: ['Lettuce', 'Tomatoes', 'Carrots', 'Broccoli'],
                    dairy: ['Milk', 'Yogurt', 'Cheese', 'Butter'],
                    meat: ['Chicken', 'Beef', 'Pork', 'Turkey'],
                    grains: ['Bread', 'Rice', 'Pasta', 'Cereal'],
                    snacks: ['Chips', 'Cookies', 'Granola', 'Nuts'],
                    beverages: ['Juice', 'Coffee', 'Tea', 'Soda'],
                    condiments: ['Ketchup', 'Mustard', 'Sauce', 'Oil'],
                    frozen: ['Frozen Vegetables', 'Ice Cream', 'Frozen Pizza']
                };
                
                const foodName = foodItems[category][
                    Math.floor(Math.random() * foodItems[category].length)
                ];

                const quantity = Math.floor(Math.random() * 500) + 50; // 50-550 units
                const quantityUnit = ['g', 'ml', 'units', 'pack'][Math.floor(Math.random() * 4)];
                const estimatedValue = (quantity * 0.01) + Math.random() * 5; // $0.50-$10.00

                wasteData.push({
                    name: foodName,
                    category: category,
                    quantity: quantity,
                    quantityUnit: quantityUnit,
                    reason: reasons[Math.floor(Math.random() * reasons.length)],
                    estimatedValue: parseFloat(estimatedValue.toFixed(2)),
                    userId: userId,
                    familyId: familyId,
                    loggedAt: date,
                });
            }
        }

        // Insert all waste data
        console.log(`📊 Inserting ${wasteData.length} waste test records...`);
        await WasteLog.insertMany(wasteData);

        // Display summary
        const wasteByCategory = await WasteLog.aggregate([
            { $match: { familyId: familyId } },
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

        console.log('\n📈 Waste Test Data Summary:');
        console.log(`Family ID: ${familyId}`);
        console.log(`User ID: ${userId}`);
        console.log(`Total Records: ${wasteData.length}`);

        console.log('\n🗑️ Waste by Category:');
        wasteByCategory.forEach((cat) => {
            console.log(`   📦 ${cat._id}: ${cat.count} items, $${cat.totalValue.toFixed(2)}`);
        });

        console.log('\n✅ Waste test data added successfully!');
        console.log('💡 Visit Waste page to see the new waste analytics!');

        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error adding waste test data:', error.message);
        process.exit(1);
    }
};

generateWasteTestData();
