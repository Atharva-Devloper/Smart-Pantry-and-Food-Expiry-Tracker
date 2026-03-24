require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not set in .env');
  process.exit(1);
}

console.log('Testing Gemini API with key:', apiKey.substring(0, 10) + '...');

const genAI = new GoogleGenerativeAI(apiKey);

async function testModels() {
  console.log('\n🔍 Testing available models...\n');

  const modelsToTest = [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro-vision-latest',
    'gemini-1.5-flash-vision-latest',
    'gemini-pro',
    'gemini-pro-vision',
    'gemini-2.0-flash',
    'gemini-2.0-pro',
    'gemini-exp-1121',
  ];

  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });

      // Try a simple request
      const result = await model.generateContent('Say "OK" if you work');
      const text = result.response.text();

      if (text.includes('OK')) {
        console.log(`✅ ${modelName} - WORKS!\n`);
        return modelName;
      }
    } catch (error) {
      const msg = error.message || error.toString();
      if (msg.includes('404')) {
        console.log(`❌ ${modelName} - Not found\n`);
      } else if (msg.includes('invalid') || msg.includes('API key')) {
        console.log(`⛔ ${modelName} - API key issue\n`);
      } else {
        console.log(`⚠️  ${modelName} - Error: ${msg.substring(0, 50)}\n`);
      }
    }
  }

  console.log('❌ No working models found!');
  console.log("\n📋 Here's what to check:");
  console.log('1. Go to: https://console.cloud.google.com');
  console.log('2. Enable "Generative Language API" for your project');
  console.log('3. Create an API key (not service account)');
  console.log('4. Update GEMINI_API_KEY in .env');
  console.log(
    '5. Or use Google AI Studio instead: https://makersuite.google.com/app/apikey'
  );
}

testModels().catch(console.error);
