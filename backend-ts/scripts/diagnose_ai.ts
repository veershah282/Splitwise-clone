import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function diagnose() {
    console.log('--- GEMINI DIAGNOSTIC START ---');
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('❌ Error: GEMINI_API_KEY is missing from .env');
        return;
    }

    console.log('🔑 API Key found (ends with... ' + apiKey.slice(-4) + ')');

    const client = new GoogleGenAI({ apiKey });
    const modelName = 'gemini-1.5-flash';

    console.log(`🤖 Attempting to connect to model: ${modelName}`);

    try {
        const response = await client.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: 'Say "Connection successful"' }] }]
        });

        console.log('✅ Response received!');
        console.log('📄 Text content:', response.text);
    } catch (error: any) {
        console.error('❌ API Error Caught:');
        console.error('Message:', error.message);
        console.error('Status:', error.status || error.statusCode);
        if (error.response) {
            console.error('Response Data:', JSON.stringify(error.response, null, 2));
        }
        console.error('Full Error Object:', JSON.stringify(error, null, 2));
    }
    console.log('--- GEMINI DIAGNOSTIC END ---');
}

diagnose();
