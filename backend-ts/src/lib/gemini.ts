import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is not set. AI features might fail.');
}

// Ensure apiKey is a string (use a dummy key in development/tests if not provided)
export const gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || 'dummy_key'
});
