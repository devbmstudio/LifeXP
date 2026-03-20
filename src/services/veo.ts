import { GoogleGenAI } from "@google/genai";

const apiKey = (import.meta as any).env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateCelebrationVideo(prompt: string) {
  if (!ai) return null;

  try {
    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `A high-energy, cinematic celebration video for achieving a major life goal: ${prompt}. Cinematic lighting, vibrant colors, celebratory atmosphere.`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });
    return operation;
  } catch (error) {
    console.error("Veo Error:", error);
    return null;
  }
}

export async function pollVideoStatus(operation: any) {
  if (!ai) return null;
  try {
    const result = await ai.operations.getVideosOperation({ operation });
    return result;
  } catch (error) {
    console.error("Veo Polling Error:", error);
    return null;
  }
}
