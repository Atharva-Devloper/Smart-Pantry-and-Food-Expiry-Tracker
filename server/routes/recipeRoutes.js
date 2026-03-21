const express = require('express');
const router = express.Router();
const { PantryItem } = require('../models');
const { suggestRecipes } = require('../utils/gemini');

// Get recipe suggestions based on current pantry items
router.get('/suggest', async (req, res) => {
  try {
    const { userId } = req.query;
    // Get items that are fresh or expiring soon
    const items = await PantryItem.find({ 
      userId, 
      status: { $in: ['fresh', 'expiring'] } 
    }).limit(10);

    const ingredientNames = items.map(item => item.name);
    
    if (ingredientNames.length === 0) {
      return res.json({ message: "Add some items to your pantry to get recipe ideas!" });
    }

    const recipes = await suggestRecipes(ingredientNames);
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
