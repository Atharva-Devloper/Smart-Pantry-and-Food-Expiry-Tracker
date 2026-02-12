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
    const products = await PantryItem.find();
    res.json(products);
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

// ---------- DELETE PRODUCT ----------

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
