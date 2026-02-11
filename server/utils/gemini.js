const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeFood(foodName) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  const text = data.candidates[0].content.parts[0].text;

  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

module.exports = { analyzeFood };
