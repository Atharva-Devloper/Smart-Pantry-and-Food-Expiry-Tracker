const express = require('express');
const router = express.Router();
const { PantryItem } = require('../models');
const { suggestRecipes } = require('../utils/gemini');
const authMiddleware = require('../middleware/auth');

// Get recipe suggestions based on current pantry items
router.get('/suggest', authMiddleware, async (req, res) => {
  try {
    console.log('🍳 Recipe suggestion requested by user:', req.userId);

    // Get items that are fresh or expiring soon
    const items = await PantryItem.find({
      userId: req.userId,
      status: { $in: ['fresh', 'expiring'] },
    }).limit(10);

    console.log(`📦 Found ${items.length} items for recipe suggestions`);

    const ingredientNames = items.map((item) => item.name);

    if (ingredientNames.length === 0) {
      console.log('⚠️ No ingredients in pantry');
      return res.json([
        {
          title: 'Empty Pantry',
          description: 'Add some items to your pantry to get recipe ideas!',
          ingredientsNeeded: [],
          instructions: [],
        },
      ]);
    }

    console.log(`🥘 Generating recipes for: ${ingredientNames.join(', ')}`);
    const recipes = await suggestRecipes(ingredientNames);

    console.log(`✅ Generated ${recipes.length} recipes`);
    res.json(recipes);
  } catch (err) {
    console.error('❌ Recipe error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
