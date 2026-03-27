const Groq = require('groq-sdk');

const MODEL_NAME = process.env.MODEL_NAME || 'llama-3.1-8b-instant';
let groqClient = null;

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (!groqClient) groqClient = new Groq({ apiKey });
  return groqClient;
}

// Simple in-memory cache for recipe suggestions (expires after 1 hour)
const recipeCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function getCacheKey(ingredients) {
  return [...ingredients].sort().join('|');
}

function tryParseJsonStrict(text) {
  const raw = (text || '').trim();
  if (!raw) return null;

  // First attempt: direct parse
  try {
    return JSON.parse(raw);
  } catch (_) {
    // continue
  }

  // Second attempt: strip common fences (defensive)
  const unfenced = raw.replace(/```(?:json)?|```/gi, '').trim();
  try {
    return JSON.parse(unfenced);
  } catch (_) {
    // continue
  }

  // Third attempt: extract first plausible JSON object/array
  const firstObj = unfenced.match(/\{[\s\S]*\}/);
  if (firstObj) {
    try {
      return JSON.parse(firstObj[0]);
    } catch (_) {
      // continue
    }
  }
  const firstArr = unfenced.match(/\[[\s\S]*\]/);
  if (firstArr) {
    try {
      return JSON.parse(firstArr[0]);
    } catch (_) {
      // continue
    }
  }

  return null;
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .filter((v) => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,]+/g)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function isValidRecipe(r) {
  return (
    r &&
    typeof r.title === 'string' &&
    r.title.trim() &&
    typeof r.description === 'string' &&
    r.description.trim() &&
    toStringArray(r.ingredientsNeeded).length > 0 &&
    // UI renders instructions as an ordered list; encourage "step-by-step" outputs
    toStringArray(r.instructions).length >= 5
  );
}

function normalizeRecipes(parsed, ingredients) {
  const fallback = getFallbackRecipes(ingredients);
  const arr = Array.isArray(parsed) ? parsed : [];

  const valid = arr
    .map((r) => ({
      title: typeof r?.title === 'string' ? r.title.trim() : '',
      description:
        typeof r?.description === 'string' ? r.description.trim() : '',
      ingredientsNeeded: toStringArray(r?.ingredientsNeeded),
      instructions: toStringArray(r?.instructions),
    }))
    .filter((r) => isValidRecipe(r));

  // Always return exactly 3 recipes; if the model returns fewer/more,
  // slice or fill deterministically to keep UI stable.
  if (valid.length >= 3) return valid.slice(0, 3);

  const out = [];
  for (let i = 0; i < 3; i++) {
    out.push(valid[i] || fallback[i]);
  }
  return out;
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
  if (!process.env.GROQ_API_KEY) {
    console.warn('GROQ_API_KEY not found, using fallback data');
    return getFallbackData(foodName);
  }

  const prompt = `Return ONLY valid JSON (no markdown, no extra text).
Schema:
{"category":"fruits|vegetables|dairy|meat|grains|snacks|beverages|condiments|frozen|other","storageLocation":"fridge|freezer|pantry|cupboard","perishability":"high|medium|low","advice":"short sentence"}
Food: ${foodName}`;

  try {
    const client = getGroqClient();
    if (!client) return getFallbackData(foodName);

    const completion = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: 'You output JSON only.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 250,
      temperature: 0.25,
    });

    const text = (completion.choices?.[0]?.message?.content || '').trim();
    const parsed = tryParseJsonStrict(text);
    if (!parsed) {
      console.error(
        'analyzeFood JSON parse error: empty/invalid JSON',
        'response:',
        text
      );
      return getFallbackData(foodName);
    }

    if (!parsed || !parsed.category || !parsed.storageLocation) {
      throw new Error('Invalid analyzeFood JSON schema');
    }

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
  if (!process.env.GROQ_API_KEY) {
    console.warn('⚠️ No GROQ API key, using fallback recipes');
    return getFallbackRecipes(ingredients);
  }

  // Check cache first
  const cacheKey = getCacheKey(ingredients);
  const cached = recipeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('💾 Using cached recipes');
    // Re-normalize to keep output stable even if prompt/parsing logic changed.
    return normalizeRecipes(cached.recipes, ingredients);
  }

  const prompt = `Return ONLY valid JSON (no markdown, no extra text).
Return EXACTLY 3 recipes.
Each recipe must be an object with:
title (string),
description (string),
ingredientsNeeded (array of strings),
instructions (array of 5-7 step strings).
Ingredients I have: ${ingredients.join(', ')}
Recipes JSON format:
[{"title":"Recipe Name","description":"Short description","ingredientsNeeded":["missing items"],"instructions":["step 1","step 2","step 3","step 4","step 5","step 6","step 7"]}]`;

  try {
    const client = getGroqClient();
    if (!client) return getFallbackRecipes(ingredients);

    const completion = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: 'You output JSON only.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 700,
      temperature: 0.4,
    });

    const text = (completion.choices?.[0]?.message?.content || '').trim();
    const parsed = tryParseJsonStrict(text);
    if (!parsed) {
      console.error(
        'suggestRecipes JSON parse error: empty/invalid JSON',
        'response:',
        text
      );
      return getFallbackRecipes(ingredients);
    }

    // Normalize to exactly 3 valid recipes for stable UI.
    const normalized = normalizeRecipes(parsed, ingredients);

    // Cache the result
    recipeCache.set(cacheKey, {
      recipes: normalized,
      timestamp: Date.now(),
    });

    console.log('✅ Recipe suggestions generated');
    return normalized;
  } catch (error) {
    console.error('❌ Error suggesting recipes:', error.message);

    if (
      error.message.includes('429') ||
      error.message.toLowerCase().includes('quota')
    ) {
      console.warn('⚠️ API quota exceeded. Using fallback recipes.');
      return getFallbackRecipes(ingredients);
    }

    return getFallbackRecipes(ingredients);
  }
}

module.exports = { analyzeFood, suggestRecipes, getFallbackRecipes };
