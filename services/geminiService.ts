import { GoogleGenAI, Type } from "@google/genai";
import { GeminiCard } from "../types";

// Get API key from environment variables
// Vite exposes env vars prefixed with VITE_ via import.meta.env
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('GEMINI_API_KEY not found in environment variables. AI flashcard generation will not work.');
}

// Initialize client
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const generateFlashcardsFromText = async (
  topic: string,
  contentContext: string
): Promise<GeminiCard[]> => {
  try {
    const prompt = `
      You are an expert educational content creator. 
      Create 5-10 high-quality flashcards based on the following topic and context.
      Topic: ${topic}
      Context: ${contentContext.substring(0, 5000)}...
      
      IMPORTANT:
      - Each card MUST have a 'front' (the question) and a 'back' (the answer).
      - The 'back' MUST NOT be empty. Provide a concise but complete answer.
      - Do not use null or empty strings for the answer.
      
      For each card, provide a clear question (front) and a concise answer (back).
      Ensure the difficulty is mixed between easy, medium, and hard concepts.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: "The question on the front of the card. Must not be empty." },
              back: { type: Type.STRING, description: "The answer on the back of the card. Must not be empty." },
              type: { type: Type.STRING, enum: ["qa"], description: "The type of card, defaults to qa" }
            },
            required: ["front", "back", "type"],
          },
        },
      },
    });

    if (response.text) {
      const cards = JSON.parse(response.text) as GeminiCard[];
      // Validate cards
      const validCards = cards.filter(c => c.front && c.back && c.front.length > 0 && c.back.length > 0);
      return validCards;
    }
    
    return [];
  } catch (error: any) {
    console.error("Error generating flashcards:", error);
    
    // Provide more specific error messages
    if (!apiKey) {
      return [{
        front: "API Key Missing",
        back: "GEMINI_API_KEY is not configured. Please add it to your .env file.",
        type: "qa" as const
      }];
    }
    
    if (error?.message?.includes('API key')) {
      return [{
        front: "Invalid API Key",
        back: "The GEMINI_API_KEY is invalid. Please check your .env file.",
        type: "qa" as const
      }];
    }
    
    // Return a fallback card if generation fails so the user sees something
    return [{
        front: "Error generating content",
        back: error?.message || "Please try again or check your connection.",
        type: "qa" as const
    }];
  }
};

// A helper to simulate extracting text from a PDF by just generating content about the filename
// since we can't easily parse PDFs in browser without heavy libs.
export const generateFlashcardsFromTopic = async (topic: string): Promise<GeminiCard[]> => {
    return generateFlashcardsFromText(topic, `General knowledge, definitions, and key concepts regarding the topic: ${topic}.`);
}