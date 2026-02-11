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

module.exports = router;
