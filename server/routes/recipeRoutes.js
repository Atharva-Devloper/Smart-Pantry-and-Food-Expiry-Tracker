const express = require('express');
const router = express.Router();
const { PantryItem, User } = require('../models');
const { suggestRecipes, getFallbackRecipes } = require('../utils/groq');
const authMiddleware = require('../middleware/auth');

// Get recipe suggestions based on current pantry items (personal + family)
router.get('/suggest', authMiddleware, async (req, res) => {
  try {
    console.log('🍳 Recipe suggestion requested by user:', req.userId);

    // Get user's current family
    const user = await User.findById(req.userId).select('currentFamilyId');
    const currentFamilyId = user?.currentFamilyId;

    // Build query - personal items + family items if applicable
    let query = {
      $or: [{ userId: req.userId }],
      status: { $in: ['fresh', 'expiring'] },
    };

    if (currentFamilyId) {
      query.$or.push({ familyId: currentFamilyId });
    }

    // Get items that are fresh or expiring soon
    const items = await PantryItem.find(query).limit(10);

    console.log(`📦 Found ${items.length} items for recipe suggestions`);

    const ingredientNames = items.map((item) => item.name);

    if (ingredientNames.length === 0) {
      console.log('⚠️ No ingredients in pantry');
      // Keep UI stable: always return 3 recipes with step-by-step instructions.
      return res.json(getFallbackRecipes([]));
    }

    console.log(`🥘 Generating recipes for: ${ingredientNames.join(', ')}`);
    const recipes = await suggestRecipes(ingredientNames);

    console.log(`✅ Generated ${recipes.length} recipes`);
    console.log(
      '✅ Recipe fields:',
      recipes.map((r) => ({
        title: r?.title,
        ingredientsNeeded: Array.isArray(r?.ingredientsNeeded)
          ? r.ingredientsNeeded.length
          : 'n/a',
        instructions: Array.isArray(r?.instructions) ? r.instructions.length : 'n/a',
      }))
    );
    res.json(recipes);
  } catch (err) {
    console.error('❌ Recipe error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
