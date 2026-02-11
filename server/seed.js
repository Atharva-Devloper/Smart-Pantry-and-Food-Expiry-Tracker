const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { PantryItem } = require('./models');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-pantry';
const DEFAULT_USER_ID = '507f1f77bcf86cd799439011';

const seedData = [
  {
    name: 'Milk',
    quantity: 2,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    category: 'dairy',
    location: 'fridge',
    userId: DEFAULT_USER_ID,
    notes: 'Buy more if on sale'
  },
  {
    name: 'Apples',
    quantity: 6,
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    category: 'fruits',
    location: 'pantry',
    userId: DEFAULT_USER_ID,
    notes: 'Green apples'
  },
  {
    name: 'Chicken Breast',
    quantity: 1,
    expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    category: 'meat',
    location: 'fridge',
    userId: DEFAULT_USER_ID,
    notes: 'Cook for dinner tomorrow'
  },
  {
    name: 'Spinach',
    quantity: 1,
    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    category: 'vegetables',
    location: 'fridge',
    userId: DEFAULT_USER_ID,
    notes: 'Check for freshness'
  },
  {
    name: 'Pasta',
    quantity: 3,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    category: 'grains',
    location: 'pantry',
    userId: DEFAULT_USER_ID,
    notes: 'Penne pasta'
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await PantryItem.deleteMany({});
    console.log('Cleared existing pantry items.');

    // Insert seed data
    await PantryItem.insertMany(seedData);
    console.log(`Successfully seeded ${seedData.length} items!`);

    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
