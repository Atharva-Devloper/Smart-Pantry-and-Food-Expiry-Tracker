const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeFood(foodName) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not found, using fallback data');
    return getFallbackData(foodName);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
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
`,
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json"
          }
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      return getFallbackData(foodName);
    }

    const text = data.candidates[0].content.parts[0].text;
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
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
    advice: `Stored ${foodName} in a cool, dry place.`
  };
}

async function suggestRecipes(ingredients) {
  if (!process.env.GEMINI_API_KEY) {
    return [{ title: "Feature Unavailable", description: "Please add a Gemini API key to see recipe suggestions." }];
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
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
`,
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json"
          }
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error('Recipe API failed');

    const text = data.candidates[0].content.parts[0].text;
    return JSON.parse(text);
  } catch (error) {
    console.error('Error suggesting recipes:', error);
    return [];
  }
}

module.exports = { analyzeFood, suggestRecipes };

