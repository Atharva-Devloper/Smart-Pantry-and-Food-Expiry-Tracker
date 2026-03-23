require('dotenv').config();
const fetch = require('node-fetch');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not set');
  process.exit(1);
}

console.log('🔍 Checking API key permissions...\n');

async function checkPermissions() {
  try {
    // Try to list available models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' }
    );

    console.log('Response status:', response.status);
    const data = await response.json();

    if (response.ok) {
      console.log('✅ API Key is valid!\n');
      console.log('📋 Available models:');
      if (data.models && data.models.length > 0) {
        data.models.forEach((model) => {
          console.log(`  - ${model.name}`);
        });
      } else {
        console.log('  (No models found in response)');
      }
      console.log('\nFull response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ API Key Error:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPermissions();
