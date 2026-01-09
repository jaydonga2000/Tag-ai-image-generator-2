import { GoogleGenAI } from "@google/genai";
import { GenerateConfig, AspectRatio } from "../types";
import { resizeImage, getTargetResolution, getImageDimensions } from "../utils/imageResize";

export interface GenerationResult {
  url: string;
  originalUrl: string;
  originalResolution: string;
}

export const generateCharacterImage = async (config: GenerateConfig): Promise<GenerationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = config.model || 'gemini-2.0-flash-exp';

  console.log("Using model:", modelName);

  const parts: any[] = [];

  // Build the prompt
  let finalPrompt = "";

  // 1. Style References - HIGHEST PRIORITY with MAXIMUM WEIGHTING
  const styleRefs = config.styleReferences.filter(s => s.base64);
  const hasStyleRefs = styleRefs.length > 0;

  if (hasStyleRefs) {
    // Only use first style reference to avoid overloading the model
    const mainStyleRef = styleRefs[0];

    finalPrompt += "=".repeat(50) + "\n";
    finalPrompt += "[CRITICAL - STYLE REFERENCE - ABSOLUTE HIGHEST PRIORITY]\n";
    finalPrompt += "=".repeat(50) + "\n\n";

    finalPrompt += "⚠️ MANDATORY STYLE MATCHING INSTRUCTIONS ⚠️\n\n";

    finalPrompt += "You MUST analyze and EXACTLY replicate the following visual elements from the reference image:\n\n";

    finalPrompt += "1. ART STYLE: Copy the exact rendering technique, whether it's 3D, 2D, painterly, cel-shaded, realistic, etc.\n";
    finalPrompt += "2. COLOR PALETTE: Match the exact color grading, saturation levels, and color harmony.\n";
    finalPrompt += "3. LIGHTING: Replicate the lighting setup - direction, softness, rim lights, ambient occlusion.\n";
    finalPrompt += "4. MATERIAL/TEXTURE: Match how surfaces are rendered - skin subsurface scattering, fabric texture, metallic/matte finishes.\n";
    finalPrompt += "5. LINE WORK: If present, match the line weight, style, and outline characteristics.\n";
    finalPrompt += "6. SHADING: Copy the shading technique - soft gradients, hard cel-shading, cross-hatching, etc.\n";
    finalPrompt += "7. ATMOSPHERE: Match the mood, tone, and overall feeling of the reference.\n\n";

    parts.push({
      inlineData: {
        mimeType: mainStyleRef.mimeType,
        data: mainStyleRef.base64!
      }
    });
    finalPrompt += `[STYLE REFERENCE IMAGE ATTACHED ABOVE]\n\n`;

    finalPrompt += "🔴 CRITICAL: The generated image MUST be INDISTINGUISHABLE in art style from the reference.\n";
    finalPrompt += "🔴 CRITICAL: Someone looking at both images should think they were made by the SAME artist.\n";
    finalPrompt += "🔴 CRITICAL: DO NOT deviate from this style under any circumstances.\n\n";

    if (styleRefs.length > 1) {
      console.log(`Note: Using only first style reference. ${styleRefs.length - 1} additional refs ignored.`);
    }
  }

  // 2. Constant Prompt (style guidelines when no style refs)
  if (config.constantPrompt && !hasStyleRefs) {
    finalPrompt += "=".repeat(50) + "\n";
    finalPrompt += "[STYLE GUIDELINES - HIGH PRIORITY]\n";
    finalPrompt += "=".repeat(50) + "\n\n";
    finalPrompt += "Follow these style instructions precisely:\n\n";
    finalPrompt += config.constantPrompt + "\n\n";
  }

  // 3. Character/Source Images (for image-to-image mode)
  if (config.mode === 'image-to-image') {
    const selectedCharacters = config.characters.filter(c => c.base64);
    if (selectedCharacters.length > 0) {
      finalPrompt += "-".repeat(50) + "\n";
      finalPrompt += "[SOURCE CHARACTERS - IDENTITY PRESERVATION]\n";
      finalPrompt += "-".repeat(50) + "\n\n";

      finalPrompt += "Transform these characters into the defined style while STRICTLY maintaining:\n";
      finalPrompt += "• Facial features and proportions\n";
      finalPrompt += "• Hair color, style, and length\n";
      finalPrompt += "• Eye color and shape\n";
      finalPrompt += "• Distinctive physical traits\n";
      finalPrompt += "• Clothing colors and key design elements\n\n";

      selectedCharacters.forEach((char, index) => {
        parts.push({
          inlineData: {
            mimeType: char.mimeType,
            data: char.base64!
          }
        });
        finalPrompt += `Character ${index + 1}: [See attached image above]\n`;
      });
      finalPrompt += "\n";
    }

    // Background
    if (config.background.file && config.background.base64) {
      parts.push({
        inlineData: {
          mimeType: config.background.mimeType,
          data: config.background.base64
        }
      });

      finalPrompt += "[BACKGROUND REFERENCE]\n";
      if (config.background.useBackground) {
        finalPrompt += "⚠️ Use this EXACT background composition, layout, and environment. [See attached]\n\n";
      } else {
        finalPrompt += "Use this as strong inspiration for lighting, atmosphere, and mood. [See attached]\n\n";
      }
    }
  }

  // 4. Scene Description - WEIGHTED
  finalPrompt += "-".repeat(50) + "\n";
  finalPrompt += "[SCENE DESCRIPTION - CONTENT TO GENERATE]\n";
  finalPrompt += "-".repeat(50) + "\n\n";
  finalPrompt += "Generate the following scene/subject:\n\n";
  finalPrompt += ">>> " + config.positivePrompt + " <<<\n\n";

  // 5. Quality boosters (include resolution hint) - ENHANCED
  // Get exact resolution based on quality and aspect ratio
  const resolutionMap: Record<string, Record<string, string>> = {
    '1K': { '1:1': '1024x1024', '3:4': '1080x1440', '4:3': '1440x1080', '9:16': '1080x1920', '16:9': '1920x1080' },
    '2K': { '1:1': '2048x2048', '3:4': '2160x2880', '4:3': '2880x2160', '9:16': '2160x3840', '16:9': '3840x2160' },
    '4K': { '1:1': '4096x4096', '3:4': '3072x4096', '4:3': '4096x3072', '9:16': '2304x4096', '16:9': '4096x2304' }
  };

  const targetResolution = resolutionMap[config.quality]?.[config.aspectRatio] ||
    (config.aspectRatio.includes('x') ? config.aspectRatio : '1920x1080');

  const qualityHint = config.quality === '2K'
    ? `4K/2K ultra-high resolution (${targetResolution}), pixel-perfect sharpness, maximum detail, professional quality`
    : `Full HD resolution (${targetResolution}), crisp details, professional quality`;

  finalPrompt += "[QUALITY REQUIREMENTS]\n";
  finalPrompt += `Target Resolution: ${targetResolution}\n`;
  if (!hasStyleRefs) {
    finalPrompt += `${qualityHint}, cinematic volumetric lighting, ray-traced ambient occlusion, masterpiece composition, award-winning quality, trending on ArtStation\n\n`;
  } else {
    finalPrompt += `${qualityHint} - but ALWAYS maintain the reference art style above all else\n\n`;
  }

  // 6. Negative prompt - STRONGLY WEIGHTED
  if (config.negativePrompt) {
    finalPrompt += "=".repeat(50) + "\n";
    finalPrompt += "[STRICTLY AVOID - DO NOT INCLUDE ANY OF THESE]\n";
    finalPrompt += "=".repeat(50) + "\n\n";
    finalPrompt += "❌ NEVER generate: " + config.negativePrompt + "\n\n";
  }

  // Final instruction - REINFORCED
  finalPrompt += "=".repeat(50) + "\n";
  finalPrompt += "[FINAL OUTPUT INSTRUCTION]\n";
  finalPrompt += "=".repeat(50) + "\n\n";
  finalPrompt += "Generate a SINGLE high-quality image that:\n";
  if (hasStyleRefs) {
    finalPrompt += "1. PERFECTLY matches the art style of the reference image (THIS IS THE #1 PRIORITY)\n";
    finalPrompt += "2. Depicts the scene/content described above\n";
    finalPrompt += "3. Maintains consistent quality throughout\n";
  } else {
    finalPrompt += "1. Follows all style guidelines precisely\n";
    finalPrompt += "2. Depicts the scene/content described above\n";
    finalPrompt += "3. Achieves the highest possible quality\n";
  }
  finalPrompt += "\nBEGIN GENERATION NOW.";

  // Add text prompt to parts
  parts.push({ text: finalPrompt });

  // Handle aspect ratio
  const supportedRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
  const isSpecificResolution = /^\d+\s*[xX]\s*\d+$/.test(config.aspectRatio);

  let aspectRatio = config.aspectRatio;

  if (isSpecificResolution) {
    const [w, h] = config.aspectRatio.split(/[xX]/).map(Number);
    const targetRatio = w / h;
    const ratioValues: Record<string, number> = {
      '1:1': 1, '16:9': 16/9, '9:16': 9/16, '4:3': 4/3, '3:4': 3/4
    };

    let closestRatio: AspectRatio = '1:1';
    let minDiff = Infinity;
    for (const [name, value] of Object.entries(ratioValues)) {
      const diff = Math.abs(targetRatio - value);
      if (diff < minDiff) {
        minDiff = diff;
        closestRatio = name as AspectRatio;
      }
    }
    aspectRatio = closestRatio;
    console.log(`Custom resolution ${w}x${h} mapped to: ${closestRatio}`);
  }

  if (!supportedRatios.includes(aspectRatio)) {
    aspectRatio = '1:1';
  }

  try {
    // Only Gemini 3 Pro supports native 2K/4K output and imageConfig
    const isGemini3Pro = modelName === 'gemini-3-pro-image-preview';
    console.log("Generating image...", {
      model: modelName,
      aspectRatio,
      imageSize: isGemini3Pro ? config.quality : '1K (client upscale)'
    });

    // Different config for free vs paid models
    const apiConfig = isGemini3Pro
      ? {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: config.quality
          }
        }
      : {
          responseModalities: ['IMAGE', 'TEXT'],
          // Free models only support aspectRatio at top level
          aspectRatio: aspectRatio
        };

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: apiConfig
    });

    // Extract image from response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';

          if (base64Data && base64Data.length > 0) {
            console.log("Image generated successfully!");
            const originalUrl = `data:${mimeType};base64,${base64Data}`;

            // Get original dimensions
            const originalRes = await getImageDimensions(originalUrl);
            const originalResolution = `${originalRes.width}x${originalRes.height}`;
            console.log(`Original resolution: ${originalResolution}`);

            // Resize to target resolution
            const targetRes = getTargetResolution(config.quality, config.aspectRatio);
            if (targetRes) {
              console.log(`Resizing to ${targetRes.width}x${targetRes.height}...`);
              try {
                const resizedUrl = await resizeImage(originalUrl, targetRes.width, targetRes.height);
                console.log("Image resized successfully!");
                return {
                  url: resizedUrl,
                  originalUrl,
                  originalResolution
                };
              } catch (resizeError) {
                console.warn("Resize failed, returning original:", resizeError);
                return {
                  url: originalUrl,
                  originalUrl,
                  originalResolution
                };
              }
            }

            return {
              url: originalUrl,
              originalUrl,
              originalResolution
            };
          }
        }
      }
    }

    throw new Error("No image data found in response - model may have returned text only");

  } catch (error: any) {
    console.error("Generation Error:", error?.message || error);
    throw error;
  }
};
