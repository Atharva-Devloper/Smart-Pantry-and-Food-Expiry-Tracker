const express = require('express');
const router = express.Router();
const { PantryItem } = require('../models');
const { analyzeFood } = require('../utils/groq');
const authMiddleware = require('../middleware/auth');

// ---------- NORMALIZATION HELPERS ----------

const normalizeCategory = (cat) => {
  const map = {
    fruit: 'fruits',
    fruits: 'fruits',
    vegetable: 'vegetables',
    vegetables: 'vegetables',
    dairy: 'dairy',
    meat: 'meat',
    grain: 'grains',
    grains: 'grains',
    snack: 'snacks',
    snacks: 'snacks',
    beverage: 'beverages',
    beverages: 'beverages',
    condiment: 'condiments',
    condiments: 'condiments',
    frozen: 'frozen',
    other: 'other',
  };

  return map[cat?.toLowerCase()] || 'other';
};

const normalizeLocation = (loc) => {
  const map = {
    fridge: 'fridge',
    refrigerator: 'fridge',
    freezer: 'freezer',
    pantry: 'pantry',
    cupboard: 'cupboard',
  };

  return map[loc?.toLowerCase()] || 'pantry';
};

// ---------- GET ALL PRODUCTS (Filtered by User) ----------

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, category, location, status, sort } = req.query;
    let query = { userId: req.userId }; // Filter by logged-in user

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Filter by location
    if (location && location !== 'all') {
      query.location = location;
    }

    // Filter by status (fresh, expiring, expired)
    if (status && status !== 'all') {
      query.status = status;
    }

    let sortQuery = { expiryDate: 1 }; // Default sort by expiry date
    if (sort === 'name') sortQuery = { name: 1 };
    if (sort === 'quantity') sortQuery = { quantity: -1 };
    if (sort === 'newest') sortQuery = { createdAt: -1 };

    console.log(`📋 Fetching products for user: ${req.userId}`);
    const products = await PantryItem.find(query).sort(sortQuery);
    console.log(`✅ Found ${products.length} products`);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- GET EXPIRY SUMMARY ----------

router.get('/summary', async (req, res) => {
  try {
    const totalItems = await PantryItem.countDocuments();
    const expiredItems = await PantryItem.countDocuments({ status: 'expired' });
    const expiringSoon = await PantryItem.countDocuments({
      status: 'expiring',
    });

    const categoryDistribution = await PantryItem.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    res.json({
      totalItems,
      expiredItems,
      expiringSoon,
      categoryDistribution,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- CREATE PRODUCT WITH AI ----------

router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('📦 Received product creation request:', {
      name: req.body.name,
      quantity: req.body.quantity,
      expiryDate: req.body.expiryDate,
      useAIFill: req.body.useAIFill,
      userId: req.userId,
    });

    // Validate required fields
    if (!req.body.name || !req.body.quantity || !req.body.expiryDate) {
      return res.status(400).json({
        message: 'Missing required fields: name, quantity, expiryDate',
      });
    }

    let aiData;
    const foodName = String(req.body.name).trim();
    const useAIFill = req.body.useAIFill !== false; // Default to true if not specified

    if (useAIFill) {
      try {
        console.log(`🤖 Calling AI for food: "${foodName}"`);
        aiData = await analyzeFood(foodName);
        console.log('✅ AI result:', aiData);
      } catch (aiErr) {
        console.error('⚠️  AI failed, using fallback:', aiErr.message);
        aiData = {
          category: 'other',
          storageLocation: 'pantry',
          perishability: 'low',
          advice: `Stored using default location.`,
        };
      }
    } else {
      // Use user-provided values when AI is disabled
      console.log('🚫 AI auto-fill disabled, using user-provided values');
      aiData = {
        category: req.body.category || 'other',
        storageLocation: req.body.location || 'pantry',
        perishability: 'unknown',
        advice: req.body.notes || '',
      };
    }

    const product = await PantryItem.create({
      ...req.body,
      userId: req.userId, // Use authenticated user's ID
      name: foodName,
      category: normalizeCategory(aiData.category),
      location: normalizeLocation(aiData.storageLocation),
      notes: aiData.advice,
    });

    console.log('✅ Product created successfully:', product._id);
    res.status(201).json(product);
  } catch (err) {
    console.error('❌ Error creating product:', err);
    res.status(400).json({ message: `Error creating product: ${err.message}` });
  }
});

// ---------- BATCH OPERATIONS ----------

router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid or empty IDs array' });
    }
    const result = await PantryItem.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${result.deletedCount} items deleted successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/batch/status', async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid or empty IDs array' });
    }
    const result = await PantryItem.updateMany(
      { _id: { $in: ids } },
      { $set: { status } }
    );
    res.json({ message: `${result.modifiedCount} items updated successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    console.log(`🗑️  Deleting product: ${req.params.id}`);
    const deletedProduct = await PantryItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId, // Only allow deletion of own products
    });

    if (!deletedProduct) {
      return res
        .status(404)
        .json({ message: 'Product not found or not authorized' });
    }

    console.log('✅ Product deleted successfully');
    res.json({
      message: 'Product deleted successfully',
      product: deletedProduct,
    });
  } catch (err) {
    console.error('❌ Error deleting product:', err);
    res.status(400).json({ message: err.message });
  }
});

// ---------- UPDATE PRODUCT ----------

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    console.log(`✏️  Updating product: ${req.params.id}`);
    const updatedProduct = await PantryItem.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId, // Only allow updates to own products
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedProduct) {
      return res
        .status(404)
        .json({ message: 'Product not found or not authorized' });
    }

    console.log('✅ Product updated successfully');
    res.json(updatedProduct);
  } catch (err) {
    console.error('❌ Error updating product:', err);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
