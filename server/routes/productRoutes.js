const express = require('express');
const router = express.Router();
const { PantryItem } = require('../models');
const { analyzeFood } = require('../utils/gemini');

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

// ---------- GET ALL PRODUCTS ----------

router.get('/', async (req, res) => {
  try {
    const { search, category, location, status, sort } = req.query;
    let query = {};

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

    const products = await PantryItem.find(query).sort(sortQuery);
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
    const expiringSoon = await PantryItem.countDocuments({ status: 'expiring' });
    
    const categoryDistribution = await PantryItem.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      totalItems,
      expiredItems,
      expiringSoon,
      categoryDistribution
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- CREATE PRODUCT WITH AI ----------

router.post('/', async (req, res) => {
  try {
    let aiData;

    try {
      aiData = await analyzeFood(req.body.name);
    } catch (err) {
      console.error('Gemini failed:', err.message);
      aiData = {
        category: 'other',
        storageLocation: 'pantry',
        perishability: 'low',
        advice: '',
      };
    }

    const product = await PantryItem.create({
      ...req.body,
      category: normalizeCategory(aiData.category),
      location: normalizeLocation(aiData.storageLocation),
      notes: aiData.advice,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
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

router.delete('/:id', async (req, res) => {
  try {
    const deletedProduct = await PantryItem.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ---------- UPDATE PRODUCT ----------

router.put('/:id', async (req, res) => {
  try {
    const updatedProduct = await PantryItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
