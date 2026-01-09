import React, { useState } from 'react';
import { Character, StyleReference, BackgroundState, GeneratedImage, GenerateConfig, ImageQuality, AspectRatio, GenerationMode, GeminiModel, GEMINI_MODELS } from './types';
import ControlPanel from './components/ControlPanel';
import ResultPanel from './components/ResultPanel';
import { fileToBase64, readFileAsUrl } from './utils/fileUtils';
import { generateCharacterImage } from './services/geminiService';

const App: React.FC = () => {
  // --- State ---
  const [generationMode, setGenerationMode] = useState<GenerationMode>('text-to-image');
  const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-2.0-flash-exp');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const [characters, setCharacters] = useState<Character[]>([
    { id: 1, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 2, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 3, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 4, file: null, previewUrl: null, base64: null, mimeType: '' },
  ]);

  const [styleReferences, setStyleReferences] = useState<StyleReference[]>([
    { id: 1, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 2, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 3, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 4, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 5, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 6, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 7, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 8, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 9, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 10, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 11, file: null, previewUrl: null, base64: null, mimeType: '' },
    { id: 12, file: null, previewUrl: null, base64: null, mimeType: '' },
  ]);

  const [background, setBackground] = useState<BackgroundState>({
    file: null,
    previewUrl: null,
    base64: null,
    useBackground: false,
    mimeType: ''
  });

  // Prompt States - Optimized for 3D Animation
  const [constantPrompt, setConstantPrompt] = useState<string>(
    'Style: High-end 3D animated movie render (Pixar/Disney/Illumination style).\n' +
    'Lighting: Soft cinematic studio lighting, rim lighting, global illumination, volumetric atmosphere.\n' +
    'Material: Subsurface scattering for skin, realistic fabric textures, clay-like tactile feel.\n' +
    'Vibe: Expressive, appealing, vibrant colors, clean topology, production-ready asset.'
  );
  
  const [positivePrompt, setPositivePrompt] = useState<string>('A brave little robot exploring a glowing mushroom forest');
  
  const [negativePrompt, setNegativePrompt] = useState<string>(
    '2d, illustration, anime, sketch, drawing, painting, oil painting, watercolor, ink, photorealistic, photography, real person, ugly, bad anatomy, distorted, blurry, pixelated, grain, noise, low quality, watermark, text, signature, bad hands, extra fingers, missing limbs, floating limbs, mutation, deformed, grayscale, dull colors'
  );

  const [quality, setQuality] = useState<ImageQuality>('2K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // History State
  const [results, setResults] = useState<GeneratedImage[]>([]);

  // --- Handlers ---

  const handleUpdateCharacter = async (id: number, file: File) => {
    try {
      const previewUrl = await readFileAsUrl(file);
      const base64 = await fileToBase64(file);
      
      setCharacters(prev => prev.map(char => 
        char.id === id 
          ? { ...char, file, previewUrl, base64, mimeType: file.type } 
          : char
      ));
    } catch (error) {
      console.error("Failed to process character image", error);
    }
  };

  const handleRemoveCharacter = (id: number) => {
    setCharacters(prev => prev.map(char => 
      char.id === id 
        ? { id, file: null, previewUrl: null, base64: null, mimeType: '' }
        : char
    ));
  };

  const handleUpdateStyleRef = async (id: number, file: File) => {
    try {
      const previewUrl = await readFileAsUrl(file);
      const base64 = await fileToBase64(file);
      
      setStyleReferences(prev => prev.map(ref => 
        ref.id === id 
          ? { ...ref, file, previewUrl, base64, mimeType: file.type } 
          : ref
      ));
    } catch (error) {
      console.error("Failed to process style reference image", error);
    }
  };

  const handleRemoveStyleRef = (id: number) => {
    setStyleReferences(prev => prev.map(ref => 
      ref.id === id 
        ? { id, file: null, previewUrl: null, base64: null, mimeType: '' }
        : ref
    ));
  };

  const handleUpdateBackground = async (file: File) => {
    try {
      const previewUrl = await readFileAsUrl(file);
      const base64 = await fileToBase64(file);
      setBackground(prev => ({
        ...prev,
        file,
        previewUrl,
        base64,
        mimeType: file.type,
        useBackground: false // Reset toggle on new upload
      }));
    } catch (error) {
      console.error("Failed to process background image", error);
    }
  };

  const handleRemoveBackground = () => {
    setBackground({
      file: null,
      previewUrl: null,
      base64: null,
      useBackground: false,
      mimeType: ''
    });
  };

  const handleToggleUseBackground = () => {
    setBackground(prev => ({ ...prev, useBackground: !prev.useBackground }));
  };

  const handleGenerate = async () => {
    if (!positivePrompt.trim()) return;
    
    setIsGenerating(true);

    const getResolutionStr = (q: ImageQuality, r: AspectRatio) => {
      const map: Record<string, Record<string, string>> = {
        '1K': { '1:1': '1024x1024', '3:4': '1080x1440', '4:3': '1440x1080', '9:16': '1080x1920', '16:9': '1920x1080' },
        '2K': { '1:1': '2048x2048', '3:4': '2160x2880', '4:3': '2880x2160', '9:16': '2160x3840', '16:9': '3840x2160' }
      };
      
      const mapped = map[q]?.[r];
      // If it's a standard ratio, return mapped pixels. 
      // If it's a custom resolution (e.g. "500x500"), return that directly.
      if (!mapped && r.includes('x')) {
          return r;
      }
      return mapped || q;
    }
    
    // Create new placeholder and prepend to history
    const newResult: GeneratedImage = { 
      id: Date.now().toString(), 
      url: '', 
      isLoading: true, 
      quality, 
      aspectRatio,
      resolution: getResolutionStr(quality, aspectRatio),
      prompt: positivePrompt // Store prompt for display
    };
    
    setResults(prev => [newResult, ...prev]);

    const config: GenerateConfig = {
      mode: generationMode,
      model: selectedModel,
      characters,
      styleReferences,
      background,
      constantPrompt,
      positivePrompt,
      negativePrompt,
      quality,
      aspectRatio
    };

    try {
        const result = await generateCharacterImage(config);

        // Update the specific item in history with both URLs
        setResults(prev => prev.map(item =>
          item.id === newResult.id
            ? {
                ...item,
                url: result.url,
                originalUrl: result.originalUrl,
                originalResolution: result.originalResolution,
                isLoading: false
              }
            : item
        ));

    } catch (error) {
      console.error("Global Generation Error", error);
      // Remove the failed placeholder
      setResults(prev => prev.filter(item => item.id !== newResult.id));
      alert("Failed to generate image. Please check your API key and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your generation history?")) {
      setResults([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 selection:bg-yellow-500 selection:text-black">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B0F19] to-black -z-10" />
      
      {/* Navbar */}
      <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
            <div className="w-10 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-black text-xs shadow-lg shadow-orange-500/20 tracking-tighter">
                TAG
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                TAG AI Image Generator
            </h1>
        </div>

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            {/* Green Active Indicator */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-sm text-slate-300">
              {GEMINI_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}
            </span>
            {(() => {
              const model = GEMINI_MODELS.find(m => m.id === selectedModel);
              return model ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  model.free
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {model.free ? 'FREE' : 'PAID'}
                </span>
              ) : null;
            })()}
          </button>

          {isModelDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsModelDropdownOpen(false)}
              />

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-2 border-b border-slate-700">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold px-2">Select Model</p>
                </div>
                <div className="p-2">
                  {GEMINI_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                        selectedModel === model.id
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{model.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            model.free
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {model.free ? 'FREE' : 'PAID'}
                          </span>
                        </div>
                        {selectedModel === model.id && (
                          <span className="text-yellow-400 text-xs">✓</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{model.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6 lg:h-[calc(100vh-4rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          
          {/* Left Column - Control Panel */}
          <div className="lg:col-span-4 xl:col-span-3 h-full min-h-[600px]">
            <ControlPanel 
              generationMode={generationMode}
              setGenerationMode={setGenerationMode}
              characters={characters}
              styleReferences={styleReferences}
              background={background}
              constantPrompt={constantPrompt}
              positivePrompt={positivePrompt}
              negativePrompt={negativePrompt}
              quality={quality}
              aspectRatio={aspectRatio}
              selectedModel={selectedModel}
              isGenerating={isGenerating}
              onUpdateCharacter={handleUpdateCharacter}
              onRemoveCharacter={handleRemoveCharacter}
              onUpdateStyleRef={handleUpdateStyleRef}
              onRemoveStyleRef={handleRemoveStyleRef}
              onUpdateBackground={handleUpdateBackground}
              onRemoveBackground={handleRemoveBackground}
              onToggleUseBackground={handleToggleUseBackground}
              onConstantPromptChange={setConstantPrompt}
              onPositivePromptChange={setPositivePrompt}
              onNegativePromptChange={setNegativePrompt}
              onQualityChange={setQuality}
              onAspectRatioChange={setAspectRatio}
              onGenerate={handleGenerate}
            />
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-8 xl:col-span-9 h-full min-h-[600px]">
            <ResultPanel 
              images={results} 
              onClearHistory={handleClearHistory}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;