const express = require('express');
const router = express.Router();
const { User, PantryItem, WasteLog, ShoppingItem, Family } = require('../models');
const { protect } = require('../utils/auth');

// Get dashboard data based on user role and family
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    const currentFamilyId = req.user.currentFamilyId;

    // Build query for personal + family items
    let query = {
      $or: [{ userId }]
    };
    
    if (currentFamilyId) {
      query.$or.push({ familyId: currentFamilyId });
    }

    // Base stats - personal + family items
    const userProducts = await PantryItem.find(query);
    const userWasteLogs = await WasteLog.countDocuments({ userId });
    const userShoppingItems = await ShoppingItem.countDocuments({ userId, familyId: currentFamilyId || null });

    // Expiry breakdown
    const today = new Date();
    const expiredCount = userProducts.filter(p => new Date(p.expiryDate) < today).length;
    const expiringSoonCount = userProducts.filter(p => {
      const expiry = new Date(p.expiryDate);
      const diff = expiry - today;
      return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
    }).length;
    const freshCount = userProducts.length - expiredCount - expiringSoonCount;

    // Family stats if applicable
    let familyStats = null;
    let familyMembers = [];
    if (currentFamilyId) {
      const family = await Family.findById(currentFamilyId)
        .populate('members.userId', 'name email');
      
      if (family) {
        familyMembers = family.members;
        const familyProducts = await PantryItem.find({ familyId: currentFamilyId });
        
        familyStats = {
          name: family.name,
          totalItems: familyProducts.length,
          memberCount: family.members.length
        };
      }
    }

    // Admin stats
    let adminStats = null;
    if (isAdmin) {
      const totalUsers = await User.countDocuments();
      const totalProducts = await PantryItem.countDocuments();
      const totalFamilies = await Family.countDocuments();

      adminStats = {
        totalUsers,
        totalProducts,
        totalFamilies
      };
    }

    // Recent items (personal + family)
    const recentItems = await PantryItem.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('addedBy', 'name');

    // Category breakdown (personal + family)
    const categoryBreakdown = await PantryItem.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      role: req.user.role,
      stats: {
        totalProducts: userProducts.length,
        totalWasteLogs: userWasteLogs,
        totalShoppingItems: userShoppingItems,
        expiredCount,
        expiringSoonCount,
        freshCount
      },
      familyStats,
      adminStats,
      familyMembers,
      recentItems,
      categoryBreakdown,
      currentFamilyId
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Failed to load dashboard data' });
  }
});

module.exports = router;
