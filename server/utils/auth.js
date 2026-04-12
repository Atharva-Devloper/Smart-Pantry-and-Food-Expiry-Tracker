const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Protect middleware - verifies JWT and adds full user object to request
const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_jwt_secret_key_here'
    );

    // Get full user details
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Add user object to request
    req.user = user;
    req.userId = user._id;
    console.log(`✅ Token verified for user: ${user.email}`);
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Admin middleware - checks if user has admin role
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

module.exports = { protect, admin };
