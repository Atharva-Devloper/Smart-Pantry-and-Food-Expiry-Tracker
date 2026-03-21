// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const { User, PantryItem } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_pantry';

console.log('Environment initialized:');
console.log('- Port:', PORT);
console.log('- MongoDB URI configured:', !!MONGODB_URI);
console.log('- Gemini key loaded:', !!process.env.GEMINI_API_KEY);

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Successfully connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

connectDB();

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  connectDB();
});

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'Smart Pantry API Server is running!' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database:
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Test routes for models (remove in production)
app.get('/api/test/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ count: users.length, users });
  } catch (error) {
    console.error(error);
  }
});

app.use('/products', require('./routes/productRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/shopping', require('./routes/shoppingRoutes'));
app.use('/api/waste', require('./routes/wasteRoutes'));
app.use('/api/recipes', require('./routes/recipeRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const startServer = (port) => {
  const numericPort = Number(port);
  if (numericPort >= 65536) {
    console.error('No available ports found below 65536');
    process.exit(1);
  }
  
  const server = app.listen(numericPort, () => {
    console.log(`Server is running on port ${numericPort}`);
    console.log(`Health check: http://localhost:${numericPort}/api/health`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${numericPort} is busy, trying ${numericPort + 1}...`);
      startServer(numericPort + 1);
    } else {
      console.error('Server error:', err);
    }
  });
};

startServer(PORT);
