
import { GoogleGenAI } from "@google/genai";

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const generateCaptionForImage = async (imageFile: File): Promise<string> => {
  if (!process.env.API_KEY) {
    // This is a fallback for development; in a real scenario, the key would be set.
    return "API Key não encontrada. Por favor, configure sua API Key.";
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const imagePart = await fileToGenerativePart(imageFile);
    const textPart = {
      text: "Escreva uma legenda curta e criativa para esta imagem, como se fosse para uma rede social. Use um tom inspirador ou divertido. Responda em português."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
    });
    
    if (response.text) {
      return response.text.trim();
    }
    
    return "Não foi possível gerar uma legenda. Tente novamente.";

  } catch (error) {
    console.error("Error generating caption with Gemini:", error);
    return "Ocorreu um erro ao gerar a legenda. Verifique o console para mais detalhes.";
  }
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key não encontrada.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `Translate the following text to ${targetLanguage}. Provide only the translation, without any introductory phrases or quotes: "${text}"`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    if (response.text) {
      return response.text.trim();
    }
    
    throw new Error("A resposta da API de tradução estava vazia.");

  } catch (error) {
    console.error("Error translating text with Gemini:", error);
    throw new Error("Ocorreu um erro ao traduzir o texto.");
  }
};
