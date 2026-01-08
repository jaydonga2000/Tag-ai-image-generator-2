export type ImageQuality = '1K' | '2K';
export type AspectRatio = string; // Changed from union to string to support custom inputs
export type GenerationMode = 'text-to-image' | 'image-to-image';

// Available Gemini models for image generation
export type GeminiModel = 'gemini-2.0-flash-exp' | 'gemini-2.0-flash-preview-image-generation' | 'imagen-3.0-generate-002' | 'gemini-3-pro-image-preview';

export const GEMINI_MODELS: { id: GeminiModel; name: string; description: string; free: boolean }[] = [
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', description: 'Fast, supports style refs', free: true },
  { id: 'gemini-2.0-flash-preview-image-generation', name: 'Gemini 2.0 Flash Preview', description: 'Preview image gen', free: true },
  { id: 'imagen-3.0-generate-002', name: 'Imagen 3.0', description: 'High quality, no style refs', free: false },
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro', description: 'Latest pro model for images', free: false },
];

export interface Character {
  id: number;
  file: File | null;
  previewUrl: string | null;
  base64: string | null;
  mimeType: string;
}

export interface StyleReference {
  id: number;
  file: File | null;
  previewUrl: string | null;
  base64: string | null;
  mimeType: string;
}

export interface BackgroundState {
  file: File | null;
  previewUrl: string | null;
  base64: string | null;
  useBackground: boolean;
  mimeType: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  originalUrl?: string; // Original API output before resize
  isLoading: boolean;
  quality: ImageQuality;
  aspectRatio: AspectRatio;
  resolution?: string;
  originalResolution?: string; // Original dimensions from API
  prompt?: string;
}

export interface GenerateConfig {
  mode: GenerationMode;
  model: GeminiModel;
  characters: Character[];
  styleReferences: StyleReference[];
  background: BackgroundState;
  constantPrompt: string;
  positivePrompt: string;
  negativePrompt: string;
  quality: ImageQuality;
  aspectRatio: AspectRatio;
}