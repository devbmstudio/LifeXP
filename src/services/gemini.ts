import { GoogleGenAI } from "@google/genai";

const apiKey = (import.meta as any).env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function getMotivationalQuote(classType: string): Promise<string> {
  if (!ai) return "The journey of a thousand miles begins with a single step.";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a short, powerful, 1-sentence motivational quote for a ${classType} in a gamified life-tracking app. Focus on growth and discipline.`,
    });
    return response.text || "Level up your reality.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Your only limit is you.";
  }
}

export async function suggestHabits(classType: string): Promise<string[]> {
  if (!ai) return ["Read 30 mins", "Exercise", "Meditation"];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 3 specific, actionable daily habits for someone who identifies as a ${classType}. Return only the habits as a comma-separated list.`,
    });
    return response.text?.split(',').map(s => s.trim()) || ["Read 30 mins", "Exercise", "Meditation"];
  } catch (error) {
    console.error("Gemini Error:", error);
    return ["Read 30 mins", "Exercise", "Meditation"];
  }
}
