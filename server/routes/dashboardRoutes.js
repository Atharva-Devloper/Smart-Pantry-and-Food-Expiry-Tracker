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

    // Base stats - personal items
    const userProducts = await PantryItem.find({ userId });
    const userWasteLogs = await WasteLog.countDocuments({ userId });
    const userShoppingItems = await ShoppingItem.countDocuments({ userId });

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

    // Recent items
    const recentItems = await PantryItem.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('addedBy', 'name');

    // Category breakdown
    const categoryBreakdown = await PantryItem.aggregate([
      { $match: { userId } },
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
