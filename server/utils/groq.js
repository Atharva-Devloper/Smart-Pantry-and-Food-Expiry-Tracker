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

const PER_UNIT_FOOD_CALORIES = [
    { keys: ['banana'], calories: 105 },
    { keys: ['apple'], calories: 95 },
    { keys: ['orange'], calories: 62 },
    { keys: ['egg'], calories: 78 },
    { keys: ['bread slice', 'slice of bread'], calories: 80 },
];

const UNIT_HEURISTIC_CALORIES = {
    g: 1.8,
    kg: 1800,
    ml: 0.7,
    l: 700,
    units: 80,
    pack: 220,
    bottle: 180,
    can: 140,
    box: 260,
    oz: 51,
    lb: 816,
    cups: 120,
    tbsp: 14,
    tsp: 5,
};

const toSafeNutritionNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};

function getHeuristicCalories(foodName, quantity, unit) {
    const qty = Number(quantity) || 0;
    if (qty <= 0) return 0;

    const normalizedUnit = String(unit || 'units').trim().toLowerCase();
    const normalizedFood = String(foodName || '').trim().toLowerCase();

    if (normalizedUnit === 'units') {
        for (const entry of PER_UNIT_FOOD_CALORIES) {
            if (entry.keys.some((k) => normalizedFood.includes(k))) {
                return Math.max(1, Math.round(qty * entry.calories));
            }
        }
    }

    return Math.max(1, Math.round(qty * (UNIT_HEURISTIC_CALORIES[normalizedUnit] || 75)));
}

async function estimateConsumedNutrition(foodName, quantity, unit) {
    const qty = Number(quantity) || 0;
    const normalizedUnit = String(unit || 'units').trim().toLowerCase();

    if (qty <= 0) {
        return {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            estimateSource: 'none',
        };
    }

    const fallbackEstimate = () => {
        const calories = getHeuristicCalories(foodName, qty, normalizedUnit);
        console.warn(
            `[GroqNutrition] Using fallback estimate for ${qty} ${normalizedUnit} of ${foodName}: ${calories} kcal`
        );
        return {
            calories,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            estimateSource: 'fallback',
        };
    };

    try {
        const client = getGroqClient();
        if (!client) {
            console.warn('[GroqNutrition] GROQ_API_KEY missing; client unavailable.');
            return fallbackEstimate();
        }

        const prompt = `Return ONLY valid JSON (no markdown, no extra text).
Estimate TOTAL nutrition for the full consumed quantity.
Do NOT return per 100g values.
Schema:
{"calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"sugar":number,"sodium":number}
Food: ${foodName}
Consumed quantity: ${qty} ${normalizedUnit}`;

        const completion = await client.chat.completions.create({
            model: MODEL_NAME,
            messages: [
                { role: 'system', content: 'You output JSON only.' },
                { role: 'user', content: prompt },
            ],
            max_tokens: 220,
            temperature: 0.2,
        });

        const text = (completion.choices?.[0]?.message?.content || '').trim();
        const parsed = tryParseJsonStrict(text);
        if (!parsed) {
            console.warn(
                `[GroqNutrition] Invalid JSON response for ${foodName}; falling back. Raw: ${text.slice(0, 180)}`
            );
            return fallbackEstimate();
        }

        const heuristicCalories = getHeuristicCalories(foodName, qty, normalizedUnit);
        const groqCalories = toSafeNutritionNumber(parsed.calories);
        const suspiciouslyLow = groqCalories < heuristicCalories * 0.35;
        const suspiciouslyHigh = groqCalories > heuristicCalories * 3.5;

        if (!groqCalories || suspiciouslyLow || suspiciouslyHigh) {
            console.warn(
                `[GroqNutrition] Correcting suspicious Groq calories for ${foodName}: groq=${groqCalories}, heuristic=${heuristicCalories}`
            );
            return {
                calories: heuristicCalories,
                protein: toSafeNutritionNumber(parsed.protein),
                carbs: toSafeNutritionNumber(parsed.carbs),
                fat: toSafeNutritionNumber(parsed.fat),
                fiber: toSafeNutritionNumber(parsed.fiber),
                sugar: toSafeNutritionNumber(parsed.sugar),
                sodium: toSafeNutritionNumber(parsed.sodium),
                estimateSource: 'groq-corrected',
            };
        }

        console.info(
            `[GroqNutrition] Groq estimate accepted for ${qty} ${normalizedUnit} of ${foodName}: ${groqCalories} kcal`
        );

        return {
            calories: groqCalories,
            protein: toSafeNutritionNumber(parsed.protein),
            carbs: toSafeNutritionNumber(parsed.carbs),
            fat: toSafeNutritionNumber(parsed.fat),
            fiber: toSafeNutritionNumber(parsed.fiber),
            sugar: toSafeNutritionNumber(parsed.sugar),
            sodium: toSafeNutritionNumber(parsed.sodium),
            estimateSource: 'groq',
        };
    } catch (error) {
        console.error('estimateConsumedNutrition error:', error.message);
        return fallbackEstimate();
    }
}

async function estimateMealNutrition(items) {
    const normalizedItems = Array.isArray(items)
        ? items
            .map((item) => ({
                foodName: String(item?.foodName || '').trim(),
                quantity: Number(item?.quantity),
                unit: String(item?.unit || 'units').trim().toLowerCase(),
            }))
            .filter((item) => item.foodName && Number.isFinite(item.quantity) && item.quantity > 0)
        : [];

    if (normalizedItems.length === 0) return [];

    const client = getGroqClient();
    if (!client) {
        console.warn('[GroqNutrition] GROQ_API_KEY missing for batch estimation; using fallback.');
        return normalizedItems.map((item) => ({
            calories: getHeuristicCalories(item.foodName, item.quantity, item.unit),
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            estimateSource: 'fallback',
        }));
    }

    const inputPayload = normalizedItems.map((item, index) => ({
        index,
        food: item.foodName,
        quantity: item.quantity,
        unit: item.unit,
    }));

    const prompt = `Return ONLY valid JSON (no markdown, no extra text).
Estimate TOTAL nutrition for EACH consumed ingredient.
Do NOT return per 100g values.
Return an array where each object follows:
{"index":number,"calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"sugar":number,"sodium":number}
Ingredients:
${JSON.stringify(inputPayload)}`;

    try {
        const completion = await client.chat.completions.create({
            model: MODEL_NAME,
            messages: [
                { role: 'system', content: 'You output JSON only.' },
                { role: 'user', content: prompt },
            ],
            max_tokens: 700,
            temperature: 0.2,
        });

        const text = (completion.choices?.[0]?.message?.content || '').trim();
        const parsed = tryParseJsonStrict(text);
        const parsedArray = Array.isArray(parsed) ? parsed : [];

        const byIndex = new Map();
        parsedArray.forEach((entry) => {
            const idx = Number(entry?.index);
            if (!Number.isInteger(idx) || idx < 0 || idx >= normalizedItems.length) return;
            byIndex.set(idx, entry);
        });

        const results = normalizedItems.map((item, index) => {
            const fallbackCalories = getHeuristicCalories(item.foodName, item.quantity, item.unit);
            const entry = byIndex.get(index);
            if (!entry) {
                return {
                    calories: fallbackCalories,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    fiber: 0,
                    sugar: 0,
                    sodium: 0,
                    estimateSource: 'fallback',
                };
            }

            const calories = toSafeNutritionNumber(entry.calories);
            const suspiciouslyLow = calories < fallbackCalories * 0.35;
            const suspiciouslyHigh = calories > fallbackCalories * 3.5;

            if (!calories || suspiciouslyLow || suspiciouslyHigh) {
                console.warn(
                    `[GroqNutrition] Correcting suspicious batch calories for ${item.foodName}: groq=${calories}, heuristic=${fallbackCalories}`
                );
                return {
                    calories: fallbackCalories,
                    protein: toSafeNutritionNumber(entry.protein),
                    carbs: toSafeNutritionNumber(entry.carbs),
                    fat: toSafeNutritionNumber(entry.fat),
                    fiber: toSafeNutritionNumber(entry.fiber),
                    sugar: toSafeNutritionNumber(entry.sugar),
                    sodium: toSafeNutritionNumber(entry.sodium),
                    estimateSource: 'groq-corrected',
                };
            }

            return {
                calories,
                protein: toSafeNutritionNumber(entry.protein),
                carbs: toSafeNutritionNumber(entry.carbs),
                fat: toSafeNutritionNumber(entry.fat),
                fiber: toSafeNutritionNumber(entry.fiber),
                sugar: toSafeNutritionNumber(entry.sugar),
                sodium: toSafeNutritionNumber(entry.sodium),
                estimateSource: 'groq',
            };
        });

        console.info(`[GroqNutrition] Batch estimated ${results.length} meal ingredients.`);
        return results;
    } catch (error) {
        console.error('estimateMealNutrition error:', error.message);
        return normalizedItems.map((item) => ({
            calories: getHeuristicCalories(item.foodName, item.quantity, item.unit),
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            estimateSource: 'fallback',
        }));
    }
}

module.exports = {
    analyzeFood,
    suggestRecipes,
    getFallbackRecipes,
    estimateConsumedNutrition,
    estimateMealNutrition,
};
