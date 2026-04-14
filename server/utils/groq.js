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

/**
 * Physical plausibility check (no food assumptions)
 * Only checks: is this physically possible?
 * Max density: ~9.5 kcal/gram (pure fat)
 */
function isPhysicallyPlausible(calories, quantity, unit) {
    const qty = Number(quantity) || 0;
    const cal = Number(calories) || 0;

    if (cal < 0) return false;
    if (qty <= 0) return false;

    const unitStr = String(unit || '').trim().toLowerCase();

    // Weight-based: max 9.5 kcal per gram (fat saturation)
    if (unitStr === 'g') {
        return cal <= qty * 9.5;
    }
    if (unitStr === 'kg') {
        return cal <= qty * 1000 * 9.5;
    }
    if (unitStr === 'oz') {
        return cal <= qty * 28.35 * 9.5;
    }
    if (unitStr === 'lb') {
        return cal <= qty * 453.59 * 9.5;
    }

    // Liquid: same density as weight
    if (unitStr === 'ml') {
        return cal <= qty * 9.5;
    }
    if (unitStr === 'l') {
        return cal <= qty * 1000 * 9.5;
    }

    // Pieces: loose upper bound (1500 kcal per piece is extreme but possible)
    if (unitStr === 'pieces' || unitStr === 'units' || unitStr === 'pack') {
        return cal <= qty * 1500;
    }

    // Unknown units: accept if positive
    return true;
}

/**
 * Density validation: checks if calorie density is realistic
 * Most foods: 0.2 - 4 kcal/gram
 * High-fat foods: up to 9 kcal/gram
 */
function isReasonableDensity(calories, quantity, unit) {
    const qty = Number(quantity) || 0;
    const cal = Number(calories) || 0;

    if (qty <= 0 || cal < 0) return false;
    if (cal === 0) return true;

    const unitStr = String(unit || '').trim().toLowerCase();
    let grams;

    if (unitStr === 'g') grams = qty;
    else if (unitStr === 'kg') grams = qty * 1000;
    else if (unitStr === 'oz') grams = qty * 28.35;
    else if (unitStr === 'lb') grams = qty * 453.59;
    else if (unitStr === 'ml') grams = qty;
    else if (unitStr === 'l') grams = qty * 1000;
    else return true; // Unknown units: don't reject

    const density = cal / grams;
    return density >= 0.2 && density <= 9.5;
}

/**
 * Quantity scaling validation: prevents unrealistic per-item calories
 * Ensures multi-piece items have reasonable per-piece values
 */
function isReasonableTotalCalories(calories, quantity, unit) {
    const qty = Number(quantity) || 0;
    const cal = Number(calories) || 0;

    if (qty <= 0 || cal < 0) return false;
    if (cal === 0) return true;

    const unitStr = String(unit || '').trim().toLowerCase();

    // Only apply to countable units
    if (unitStr === 'pieces' || unitStr === 'units') {
        // Prevent unrealistically low per-item calories
        return cal >= qty * 30;
    }

    return true;
}

/**
 * Suspicious density check: soft upper guard for unrealistic density
 * Density > 5 kcal/g is suspicious (only pure fats reach this)
 * This is a WARNING only, not a rejection
 */
function isSuspiciousDensity(calories, quantity, unit) {
    const qty = Number(quantity) || 0;
    const cal = Number(calories) || 0;

    if (qty <= 0 || cal < 0) return false;
    if (cal === 0) return false;

    const unitStr = String(unit || '').toLowerCase();
    let grams;

    if (unitStr === 'g') grams = qty;
    else if (unitStr === 'kg') grams = qty * 1000;
    else if (unitStr === 'ml') grams = qty;
    else if (unitStr === 'l') grams = qty * 1000;
    else return false;

    const density = cal / grams;
    return density > 5; // suspicious zone
}

/**
 * Upper scaling sanity: prevents explosion on small measured quantities
 * For tsp, tbsp, g, ml: cap at 200 kcal per unit
 * Allows oil (~120 kcal/tbsp) and mayo (~100 kcal/tbsp)
 * Catches sugar explosion (3 tsp → 765 kcal)
 */
function isReasonableUpperCalories(calories, quantity, unit) {
    const qty = Number(quantity) || 0;
    const cal = Number(calories) || 0;

    if (qty <= 0 || cal < 0) return false;

    const unitStr = String(unit || '').toLowerCase();

    // Only apply to measurable units
    if (['g', 'ml', 'tsp', 'tbsp'].includes(unitStr)) {
        return cal <= qty * 200;
    }

    return true;
}

/**
 * Normalize vague units to standard forms
 * Helps reduce LLM confusion on ambiguous units
 */
function normalizeUnit(unit) {
    const u = String(unit || '').toLowerCase().trim();

    // Recognize common vague descriptors
    if (u.includes('cup')) return 'cup';
    if (u.includes('bowl')) return 'serving';
    if (u.includes('plate')) return 'serving';
    if (u.includes('tbsp')) return 'tbsp';
    if (u.includes('tsp')) return 'tsp';
    if (u.includes('glass')) return 'serving';
    if (u.includes('slice')) return 'slices';

    return u;
}

/**
 * Smart fallback: unit-aware baseline (not food-based)
 * Provides reasonable estimates without nutritional assumptions
 */
function getNeutralFallbackCalories(quantity, unit) {
    const qty = Number(quantity) || 0;
    if (qty <= 0) return 1;

    const unitStr = String(unit || '').toLowerCase().trim();

    // Weight-based: middle-ground density
    if (unitStr === 'g' || unitStr === 'ml') {
        return Math.round(qty * 1.5);
    }

    // Volume-based (cups, servings): generic item baseline
    if (['cup', 'cups', 'serving', 'serving'].includes(unitStr)) {
        return Math.round(qty * 120);
    }

    // Countable items: ~100 kcal per piece (conservative)
    if (unitStr === 'pieces' || unitStr === 'units' || unitStr === 'slices') {
        return Math.round(qty * 100);
    }

    // Small measures: ~25 kcal per tbsp, ~5 per tsp
    if (unitStr === 'tbsp') return Math.round(qty * 25);
    if (unitStr === 'tsp') return Math.round(qty * 5);

    // Default: 50 kcal per unit
    return Math.round(qty * 50);
}

const toSafeNutritionNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};

async function estimateConsumedNutrition(foodName, quantity, unit) {
    const qty = Number(quantity) || 0;
    const normalizedUnit = normalizeUnit(unit);

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
            confidence: 'low',
        };
    }

    try {
        const client = getGroqClient();
        if (!client) {
            console.error(`[GroqNutrition] GROQ_API_KEY missing - no Groq available`);
            const fallbackCals = getNeutralFallbackCalories(qty, normalizedUnit);
            return {
                calories: fallbackCals,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0,
                sugar: 0,
                sodium: 0,
                estimateSource: 'fallback',
                confidence: 'low',
            };
        }

        const prompt = `Return ONLY valid JSON (no extra text).

Estimate TOTAL nutrition for the FULL consumed amount.
Do NOT return per-100g values. Return what was ACTUALLY consumed.

CRITICAL RULES:
* You MUST calculate based on the FULL quantity
* You MUST scale calories correctly with quantity
* Most foods fall between 0.2 and 4 kcal per gram
* High-fat foods may go up to 9 kcal per gram, but rarely
* If the unit is vague (bowl, plate, serving), assume a realistic standard portion
* DO NOT output values that imply unrealistic density
* DO NOT underestimate multi-piece items
* Respect the unit EXACTLY

Food: ${foodName}
Quantity: ${qty} ${normalizedUnit}

JSON Schema:
{"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "sodium": number}`;

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

        // Single retry mechanism for parsing failures
        if (!parsed) {
            console.warn(`[GroqNutrition] PARSE FAILED on first attempt for "${foodName}" - retrying`);
            const retryPrompt = prompt + "\n\nRecalculate carefully. The previous result was invalid or unrealistic.";

            try {
                const retryCompletion = await client.chat.completions.create({
                    model: MODEL_NAME,
                    messages: [
                        { role: 'system', content: 'You output JSON only.' },
                        { role: 'user', content: retryPrompt },
                    ],
                    max_tokens: 220,
                    temperature: 0.1,
                });
                const retryText = (retryCompletion.choices?.[0]?.message?.content || '').trim();
                parsed = tryParseJsonStrict(retryText);
            } catch (retryError) {
                console.error(`[GroqNutrition] RETRY FAILED for "${foodName}": ${retryError.message}`);
            }
        }

        if (!parsed) {
            console.error(`[GroqNutrition] PARSE FAILED (retried) for "${foodName}" (${qty}${normalizedUnit}). Raw: ${text.slice(0, 100)}`);
            const fallbackCals = getNeutralFallbackCalories(qty, normalizedUnit);
            return {
                calories: fallbackCals,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0,
                sugar: 0,
                sodium: 0,
                estimateSource: 'fallback',
                confidence: 'low',
            };
        }

        const groqCalories = toSafeNutritionNumber(parsed.calories);
        let confidence = 'high';
        let finalCalories = groqCalories;

        // Soft warning for suspicious density
        if (isSuspiciousDensity(groqCalories, qty, normalizedUnit)) {
            const clampedCals = Math.min(groqCalories, qty * 5);
            if (clampedCals < groqCalories) {
                console.warn(`[GroqNutrition] CLAMPED suspicious density for "${foodName}" (${qty}${normalizedUnit}): ${groqCalories} → ${clampedCals} kcal`);
                finalCalories = clampedCals;
                confidence = 'low';
            } else {
                console.warn(`[GroqNutrition] ⚠️ SUSPICIOUS density for "${foodName}" (${qty}${normalizedUnit}): ${groqCalories} kcal (>5 kcal/g)`);
                confidence = 'medium';
            }
        }

        // Hard validation: must pass all checks
        if (
            !isPhysicallyPlausible(finalCalories, qty, normalizedUnit) ||
            !isReasonableDensity(finalCalories, qty, normalizedUnit) ||
            !isReasonableTotalCalories(finalCalories, qty, normalizedUnit) ||
            !isReasonableUpperCalories(finalCalories, qty, normalizedUnit)
        ) {
            console.error(`[GroqNutrition] VALIDATION FAILED for "${foodName}" (${qty}${normalizedUnit}): ${finalCalories} kcal (physics, density, scaling, or upper-limit check failed)`);
            const fallbackCals = getNeutralFallbackCalories(qty, normalizedUnit);
            return {
                calories: fallbackCals,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0,
                sugar: 0,
                sodium: 0,
                estimateSource: 'fallback',
                confidence: 'low',
            };
        }

        console.info(`[GroqNutrition] OK "${foodName}" (${qty}${normalizedUnit}): ${finalCalories} kcal [confidence: ${confidence}]`);

        return {
            calories: finalCalories,
            protein: toSafeNutritionNumber(parsed.protein),
            carbs: toSafeNutritionNumber(parsed.carbs),
            fat: toSafeNutritionNumber(parsed.fat),
            fiber: toSafeNutritionNumber(parsed.fiber),
            sugar: toSafeNutritionNumber(parsed.sugar),
            sodium: toSafeNutritionNumber(parsed.sodium),
            estimateSource: 'groq',
            confidence,
        };
    } catch (error) {
        console.error(`[GroqNutrition] ERROR for "${foodName}" (${qty}${normalizedUnit}): ${error.message}`);
        const fallbackCals = getNeutralFallbackCalories(qty, normalizedUnit);
        return {
            calories: fallbackCals,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            estimateSource: 'fallback',
            confidence: 'low',
        };
    }
}

async function estimateMealNutrition(items) {
    const normalizedItems = Array.isArray(items)
        ? items
            .map((item) => ({
                foodName: String(item?.foodName || '').trim(),
                quantity: Number(item?.quantity),
                unit: normalizeUnit(item?.unit),
            }))
            .filter((item) => item.foodName && Number.isFinite(item.quantity) && item.quantity > 0)
        : [];

    if (normalizedItems.length === 0) return [];

    const client = getGroqClient();
    if (!client) {
        console.error('[GroqNutrition] GROQ_API_KEY missing for batch estimation.');
        return normalizedItems.map((item) => ({
            calories: getNeutralFallbackCalories(item.quantity, item.unit),
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            estimateSource: 'fallback',
            confidence: 'low',
        }));
    }

    const inputPayload = normalizedItems.map((item, index) => ({
        index,
        food: item.foodName,
        quantity: item.quantity,
        unit: item.unit,
    }));

    const prompt = `Return ONLY valid JSON array (no extra text).

Estimate TOTAL nutrition for EACH consumed ingredient.
Do NOT return per-100g values. Return what was ACTUALLY consumed.

CRITICAL RULES:
* You MUST calculate based on the FULL quantity
* You MUST scale calories correctly with quantity
* Most foods fall between 0.2 and 4 kcal per gram
* High-fat foods may go up to 9 kcal per gram, but rarely
* If the unit is vague (bowl, plate, serving), assume a realistic standard portion
* DO NOT output values that imply unrealistic density
* DO NOT underestimate multi-piece items
* Respect the given units EXACTLY

Return array:
[{"index": number, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "sodium": number}, ...]

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
            const entry = byIndex.get(index);
            if (!entry) {
                console.error(`[GroqNutrition] NO RESPONSE for "${item.foodName}" (${item.quantity}${item.unit})`);
                const fallbackCals = getNeutralFallbackCalories(item.quantity, item.unit);
                return {
                    calories: fallbackCals,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    fiber: 0,
                    sugar: 0,
                    sodium: 0,
                    estimateSource: 'fallback',
                    confidence: 'low',
                };
            }

            const calories = toSafeNutritionNumber(entry.calories);
            let confidence = 'high';
            let finalCalories = calories;

            // Soft warning for suspicious density
            if (isSuspiciousDensity(calories, item.quantity, item.unit)) {
                const clampedCals = Math.min(calories, item.quantity * 5);
                if (clampedCals < calories) {
                    console.warn(`[GroqNutrition] CLAMPED suspicious density for "${item.foodName}" (${item.quantity}${item.unit}): ${calories} → ${clampedCals} kcal`);
                    finalCalories = clampedCals;
                    confidence = 'low';
                } else {
                    console.warn(`[GroqNutrition] ⚠️ SUSPICIOUS density for "${item.foodName}" (${item.quantity}${item.unit}): ${calories} kcal (>5 kcal/g)`);
                    confidence = 'medium';
                }
            }

            // Hard validation: must pass all checks
            if (
                !isPhysicallyPlausible(finalCalories, item.quantity, item.unit) ||
                !isReasonableDensity(finalCalories, item.quantity, item.unit) ||
                !isReasonableTotalCalories(finalCalories, item.quantity, item.unit) ||
                !isReasonableUpperCalories(finalCalories, item.quantity, item.unit)
            ) {
                console.error(`[GroqNutrition] VALIDATION FAILED for "${item.foodName}" (${item.quantity}${item.unit}): ${finalCalories} kcal (physics, density, scaling, or upper-limit check failed)`);
                const fallbackCals = getNeutralFallbackCalories(item.quantity, item.unit);
                return {
                    calories: fallbackCals,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    fiber: 0,
                    sugar: 0,
                    sodium: 0,
                    estimateSource: 'fallback',
                    confidence: 'low',
                };
            }

            console.info(`[GroqNutrition] OK "${item.foodName}" (${item.quantity}${item.unit}): ${finalCalories} kcal [confidence: ${confidence}]`);

            return {
                calories: finalCalories,
                protein: toSafeNutritionNumber(entry.protein),
                carbs: toSafeNutritionNumber(entry.carbs),
                fat: toSafeNutritionNumber(entry.fat),
                fiber: toSafeNutritionNumber(entry.fiber),
                sugar: toSafeNutritionNumber(entry.sugar),
                sodium: toSafeNutritionNumber(entry.sodium),
                estimateSource: 'groq',
                confidence,
            };
        });

        console.info(`[GroqNutrition] Batch estimated ${results.length} meal ingredients.`);
        return results;
    } catch (error) {
        console.error(`[GroqNutrition] EXCEPTION in batch: ${error.message}`);
        return normalizedItems.map((item) => ({
            calories: getNeutralFallbackCalories(item.quantity, item.unit),
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            estimateSource: 'fallback',
            confidence: 'low',
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
