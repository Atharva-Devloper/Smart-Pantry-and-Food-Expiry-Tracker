// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const { User, PantryItem } = require('./models');

const getRequiredEnv = (name) => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI =
    process.env.MONGO_URI || getRequiredEnv('MONGODB_URI');

console.log('Environment initialized:');
console.log('- Port:', PORT);
console.log('- MongoDB URI configured:', !!MONGODB_URI);
console.log('- Groq key loaded:', !!process.env.GROQ_API_KEY);

// Middleware
app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            // Allow localhost on any port
            if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                return callback(null, true);
            }

            // Allow from environment variable
            if (origin === process.env.CLIENT_URL) {
                return callback(null, true);
            }

            return callback(new Error('Not allowed by CORS'));
        },
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

// Debug route to test product endpoint
app.get('/api/debug/products', async (req, res) => {
    try {
        console.log('📋 Fetching all products for debug...');
        const { PantryItem } = require('./models');
        const products = await PantryItem.find().limit(5);
        res.json({
            message: 'Product endpoint is working',
            count: products.length,
            products,
            baseUrl: `${req.protocol}://${req.get('host')}`,
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.use('/products', require('./routes/productRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/shopping', require('./routes/shoppingRoutes'));
app.use('/api/waste', require('./routes/wasteRoutes'));
app.use('/api/recipes', require('./routes/recipeRoutes'));
app.use('/api/family', require('./routes/familyRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/calories', require('./routes/calorieTracker'));

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
    if (!Number.isInteger(numericPort) || numericPort <= 0) {
        throw new Error('PORT must be a valid positive integer');
    }

    const server = app
        .listen(numericPort, '0.0.0.0', () => {
            console.log(`✓ Server is running on port ${numericPort}`);
            console.log(`  Health check: http://localhost:${numericPort}/api/health`);
        })
        .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(
                    `✗ Port ${numericPort} is already in use. Please close the process using that port.`
                );
                console.error('   Run: lsof -i :' + numericPort);
                process.exit(1);
            } else {
                console.error('Server error:', err);
                process.exit(1);
            }
        });
};

startServer(PORT);
