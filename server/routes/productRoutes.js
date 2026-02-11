const express = require('express');
const router = express.Router();
const { PantryItem } = require('../models');

router.get('/', async (req, res) => {
  try {
    const products = await PantryItem.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const product = await PantryItem.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE product by ID
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

// UPDATE product by ID
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
