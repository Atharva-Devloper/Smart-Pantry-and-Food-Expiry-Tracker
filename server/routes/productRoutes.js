const express = require('express');
const router = express.Router();
const { PantryItem } = require('../models/PantryItem');

router.get('/', (req, res) => {
  res.json([]);
});

module.exports = router;
