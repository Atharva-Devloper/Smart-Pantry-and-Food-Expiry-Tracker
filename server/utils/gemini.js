const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Simple in-memory cache for recipe suggestions (expires after 1 hour)
const recipeCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function getCacheKey(ingredients) {
  return ingredients.sort().join('|');
}

function getFallbackRecipes(ingredients) {
  return [
    {
      title: 'Simple Stir Fry',
      description: 'Quick and easy stir-fry using whatever vegetables you have',
      ingredientsNeeded: ['soy sauce', 'garlic', 'oil'],
      instructions: [
        'Heat oil in a pan',
        `Add ${ingredients[0] || 'vegetables'}`,
        'Stir fry for 5-7 minutes',
        'Add soy sauce and garlic',
        'Cook for 2 more minutes',
      ],
    },
    {
      title: 'Veggie Soup',
      description: 'Warm and comforting soup',
      ingredientsNeeded: ['water', 'salt', 'pepper'],
      instructions: [
        'Boil water',
        `Add ${ingredients[0] || 'vegetables'} and ${ingredients[1] || 'herbs'}`,
        'Simmer for 15 minutes',
        'Season with salt and pepper',
        'Serve hot',
      ],
    },
    {
      title: 'Simple Salad',
      description: 'Fresh and healthy salad',
      ingredientsNeeded: ['dressing', 'salt'],
      instructions: [
        `Wash and chop ${ingredients[0] || 'ingredients'}`,
        'Place in a bowl',
        'Add dressing',
        'Mix well',
        'Serve immediately',
      ],
    },
  ];
}

async function analyzeFood(foodName) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not found, using fallback data');
    return getFallbackData(foodName);
  }

  try {
    // Use the newer Gemini models available
    const models = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
    ];
    let model;

    for (const modelName of models) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        const testResult = await model.generateContent('OK');
        console.log(`✅ Using Gemini model: ${modelName}`);
        break;
      } catch (err) {
        console.log(`Trying next model...`);
      }
    }

    if (!model) {
      throw new Error('No compatible Gemini models available');
    }

    const prompt = `
You are a food classification system.

Return ONLY valid JSON in this format:
{
  "category": "fruits | vegetables | dairy | meat | grains | snacks | beverages | condiments | frozen | other",
  "storageLocation": "fridge | freezer | pantry | cupboard",
  "perishability": "high | medium | low",
  "advice": "short sentence"
}

Use lowercase values exactly as written above.

Food: "${foodName}"
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    console.log(
      `✅ AI Analysis for "${foodName}": ${parsed.category} → ${parsed.storageLocation}`
    );
    return parsed;
  } catch (error) {
    console.error('Error in analyzeFood:', error.message);
    return getFallbackData(foodName);
  }
}

function getFallbackData(foodName) {
  return {
    category: 'other',
    storageLocation: 'pantry',
    perishability: 'medium',
    advice: `Stored ${foodName} in a cool, dry place.`,
  };
}

async function suggestRecipes(ingredients) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ No Gemini API key, using fallback recipes');
    return getFallbackRecipes(ingredients);
  }

  // Check cache first
  const cacheKey = getCacheKey(ingredients);
  const cached = recipeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('💾 Using cached recipes');
    return cached.recipes;
  }

  try {
    // Use the newer Gemini models available
    const models = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
    ];
    let model;

    for (const modelName of models) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        const testResult = await model.generateContent('OK');
        console.log(`✅ Using Gemini model for recipes: ${modelName}`);
        break;
      } catch (err) {
        console.log(`⏭️ Trying next model...`);
      }
    }

    if (!model) {
      throw new Error('No compatible Gemini models available');
    }

    const prompt = `
You are a creative chef. Based on these ingredients in my pantry: ${ingredients.join(', ')}, suggest 3 simple recipes.

Return ONLY valid JSON in this format:
[
  {
    "title": "Recipe Name",
    "description": "Short description",
    "ingredientsNeeded": ["list", "of", "missing", "items"],
    "instructions": ["step 1", "step 2"]
  }
]
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    // Strip markdown code blocks if present
    text = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(text);
    console.log(`✅ Recipe suggestions generated`);
    
    // Cache the result
    recipeCache.set(cacheKey, {
      recipes: parsed,
      timestamp: Date.now(),
    });
    
    return parsed;
  } catch (error) {
    console.error('❌ Error suggesting recipes:', error.message);
    
    // Check if it's a quota/rate limit error
    if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('Quota exceeded')) {
      console.warn('⚠️ API quota exceeded. Using fallback recipes.');
      return getFallbackRecipes(ingredients);
    }
    
    // For other errors, also use fallback
    return getFallbackRecipes(ingredients);
  }
}

module.exports = { analyzeFood, suggestRecipes };
