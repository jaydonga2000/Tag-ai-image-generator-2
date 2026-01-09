import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Character, StyleReference, BackgroundState, ImageQuality, AspectRatio, GenerationMode } from '../types';
import CharacterSlot from './CharacterSlot';
import StyleRefSlot from './StyleRefSlot';
import { Image as ImageIcon, Sparkles, Upload, Settings2, Trash2, MessageSquare, Ban, Lock, Palette, Type, ImagePlus, Save, Check, X, RotateCcw } from 'lucide-react';

interface ControlPanelProps {
  generationMode: GenerationMode;
  setGenerationMode: (mode: GenerationMode) => void;
  characters: Character[];
  styleReferences: StyleReference[];
  background: BackgroundState;
  
  constantPrompt: string;
  positivePrompt: string;
  negativePrompt: string;

  quality: ImageQuality;
  aspectRatio: AspectRatio;
  isGenerating: boolean;
  onUpdateCharacter: (id: number, file: File) => void;
  onRemoveCharacter: (id: number) => void;
  onUpdateStyleRef: (id: number, file: File) => void;
  onRemoveStyleRef: (id: number) => void;
  onUpdateBackground: (file: File) => void;
  onRemoveBackground: () => void;
  onToggleUseBackground: () => void;
  
  onConstantPromptChange: (text: string) => void;
  onPositivePromptChange: (text: string) => void;
  onNegativePromptChange: (text: string) => void;
  
  onQualityChange: (q: ImageQuality) => void;
  onAspectRatioChange: (r: AspectRatio) => void;
  onGenerate: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  generationMode,
  setGenerationMode,
  characters,
  styleReferences,
  background,
  constantPrompt,
  positivePrompt,
  negativePrompt,
  quality,
  aspectRatio,
  isGenerating,
  onUpdateCharacter,
  onRemoveCharacter,
  onUpdateStyleRef,
  onRemoveStyleRef,
  onUpdateBackground,
  onRemoveBackground,
  onToggleUseBackground,
  onConstantPromptChange,
  onPositivePromptChange,
  onNegativePromptChange,
  onQualityChange,
  onAspectRatioChange,
  onGenerate
}) => {
  const bgInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingBg, setIsDraggingBg] = useState(false);
  const [isCustomRatio, setIsCustomRatio] = useState(false);
  
  // Custom Resolution State
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [savedResolutionMsg, setSavedResolutionMsg] = useState<string | null>(null);
  const [savedResolutions, setSavedResolutions] = useState<string[]>([]);
  
  // Drag states for containers
  const [isDraggingCharContainer, setIsDraggingCharContainer] = useState(false);
  const [isDraggingStyleContainer, setIsDraggingStyleContainer] = useState(false);

  // Calculate detected ratio from custom resolution
  const detectedRatio = useMemo(() => {
    if (!customWidth || !customHeight) return null;
    const w = parseInt(customWidth);
    const h = parseInt(customHeight);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;

    const targetRatio = w / h;
    const ratioValues: Record<string, number> = {
      '1:1': 1, '16:9': 16/9, '9:16': 9/16, '4:3': 4/3, '3:4': 3/4
    };

    let closestRatio = '1:1';
    let minDiff = Infinity;
    for (const [name, value] of Object.entries(ratioValues)) {
      const diff = Math.abs(targetRatio - value);
      if (diff < minDiff) {
        minDiff = diff;
        closestRatio = name;
      }
    }
    return closestRatio;
  }, [customWidth, customHeight]);

  // Calculate output resolution based on detected ratio and quality
  const outputResolution = useMemo(() => {
    if (!detectedRatio) return null;
    const resolutionMap: Record<string, Record<string, string>> = {
      '1K': { '1:1': '1024x1024', '3:4': '1080x1440', '4:3': '1440x1080', '9:16': '1080x1920', '16:9': '1920x1080' },
      '2K': { '1:1': '2048x2048', '3:4': '2160x2880', '4:3': '2880x2160', '9:16': '2160x3840', '16:9': '3840x2160' },
      '4K': { '1:1': '4096x4096', '3:4': '3072x4096', '4:3': '4096x3072', '9:16': '2304x4096', '16:9': '4096x2304' }
    };
    return resolutionMap[quality]?.[detectedRatio] || null;
  }, [detectedRatio, quality]);

  // Load saved resolutions from localStorage on mount
  useEffect(() => {
    try {
        const stored = localStorage.getItem('tag_ai_custom_resolutions');
        if (stored) {
            setSavedResolutions(JSON.parse(stored));
        }
    } catch (e) {
        console.warn("Failed to load custom resolutions", e);
    }
  }, []);

  // Sync inputs with prop if it matches format
  useEffect(() => {
    if (isCustomRatio && aspectRatio && aspectRatio.includes('x')) {
      const [w, h] = aspectRatio.split('x');
      if (!isNaN(Number(w)) && !isNaN(Number(h))) {
        setCustomWidth(w);
        setCustomHeight(h);
      }
    }
  }, [aspectRatio, isCustomRatio]);

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpdateBackground(e.target.files[0]);
    }
  };

  // Background Drag Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBg(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBg(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBg(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onUpdateBackground(file);
      }
    }
  };
  
  // Batch Drop Handler helper
  const handleBatchDrop = (
    e: React.DragEvent, 
    type: 'character' | 'style'
  ) => {
    e.preventDefault();
    if (type === 'character') setIsDraggingCharContainer(false);
    if (type === 'style') setIsDraggingStyleContainer(false);
    
    // Get all image files
    const files = Array.from(e.dataTransfer.files).filter((f: any) => f.type.startsWith('image/'));
    
    if (files.length === 0) return;
    
    if (type === 'character') {
      files.forEach((file, index) => {
        if (index < characters.length) {
          onUpdateCharacter(characters[index].id, file);
        }
      });
    } else if (type === 'style') {
      files.forEach((file, index) => {
        if (index < styleReferences.length) {
          onUpdateStyleRef(styleReferences[index].id, file);
        }
      });
    }
  };

  const getResolutionDisplay = (q: ImageQuality, r: AspectRatio) => {
    const map: Record<string, Record<string, string>> = {
      '1K': { '1:1': '1024x1024', '3:4': '1080x1440', '4:3': '1440x1080', '9:16': '1080x1920', '16:9': '1920x1080' },
      '2K': { '1:1': '2048x2048', '3:4': '2160x2880', '4:3': '2880x2160', '9:16': '2160x3840', '16:9': '3840x2160' },
      '4K': { '1:1': '4096x4096', '3:4': '3072x4096', '4:3': '4096x3072', '9:16': '2304x4096', '16:9': '4096x2304' }
    };
    return map[q]?.[r] || 'Custom';
  };

  const getAspectRatioVisualClass = (r: AspectRatio) => {
    switch (r) {
        case '1:1': return 'w-[18px] h-[18px]';
        case '16:9': return 'w-[22px] h-[13px]';
        case '9:16': return 'w-[13px] h-[22px]';
        case '4:3': return 'w-[20px] h-[15px]';
        case '3:4': return 'w-[15px] h-[20px]';
        default: return 'w-[18px] h-[18px]';
    }
  };

  const updateAspectRatioIfValid = (w: string, h: string) => {
      if (w.length > 0 && h.length > 0 && !isNaN(Number(w)) && !isNaN(Number(h))) {
          onAspectRatioChange(`${w}x${h}`);
      }
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Strict 4 digit limit
    if (value.length <= 4) {
      setCustomWidth(value);
      setSavedResolutionMsg(null);
      updateAspectRatioIfValid(value, customHeight);
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Strict 4 digit limit
    if (value.length <= 4) {
      setCustomHeight(value);
      setSavedResolutionMsg(null);
      updateAspectRatioIfValid(customWidth, value);
    }
  };
  
  const handleResetResolution = () => {
    setCustomWidth('');
    setCustomHeight('');
    setSavedResolutionMsg(null);
  };

  const handleSaveResolution = () => {
    if (customWidth && customHeight) {
      const res = `${customWidth}x${customHeight}`;
      onAspectRatioChange(res);
      setSavedResolutionMsg(`Saved: ${res}`);
      
      // Add to persistent storage
      setSavedResolutions(prev => {
        // Prevent duplicates, move to top if exists
        const filtered = prev.filter(r => r !== res);
        const next = [res, ...filtered];
        localStorage.setItem('tag_ai_custom_resolutions', JSON.stringify(next));
        return next;
      });
    }
  };

  const removeSavedResolution = (resToRemove: string) => {
    setSavedResolutions(prev => {
        const next = prev.filter(r => r !== resToRemove);
        localStorage.setItem('tag_ai_custom_resolutions', JSON.stringify(next));
        return next;
    });
  };

  const standardRatios: AspectRatio[] = ['16:9', '9:16', '1:1', '4:3', '3:4'];
  const qualities: ImageQuality[] = ['1K', '2K', '4K'];

  const currentResString = `${customWidth}x${customHeight}`;
  const isAlreadySaved = savedResolutions.includes(currentResString);
  const isActive = aspectRatio === currentResString;

  // Smart Sorting: Matches first, then others
  const sortedSavedResolutions = useMemo(() => {
    if (!customWidth && !customHeight) return savedResolutions;

    const matches: string[] = [];
    const others: string[] = [];

    savedResolutions.forEach(res => {
        const [w, h] = res.split('x');
        // Use startsWith for natural typing match (e.g. typing "5" matches "500")
        const matchW = !customWidth || w.startsWith(customWidth);
        const matchH = !customHeight || h.startsWith(customHeight);
        
        if (matchW && matchH) {
            matches.push(res);
        } else {
            others.push(res);
        }
    });

    return [...matches, ...others];
  }, [savedResolutions, customWidth, customHeight]);

  return (
    <div className="h-full flex flex-col gap-6 p-6 bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-sm overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          Control Panel
        </h2>
        <p className="text-sm text-slate-400 mt-1">Configure your animation assets.</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex bg-slate-800/80 p-1 rounded-xl">
        <button
          onClick={() => setGenerationMode('text-to-image')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            generationMode === 'text-to-image'
              ? 'bg-slate-600 text-white shadow-md shadow-black/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          <Type className="w-4 h-4" />
          Text to Image
        </button>
        <button
          onClick={() => setGenerationMode('image-to-image')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            generationMode === 'image-to-image'
              ? 'bg-slate-600 text-white shadow-md shadow-black/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          <ImagePlus className="w-4 h-4" />
          Image to Image
        </button>
      </div>

      {/* 1. Source Image (Formerly Reference Characters) - ONLY IN IMAGE TO IMAGE MODE */}
      {generationMode === 'image-to-image' && (
        <section className="animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Source Image</span>
            {isDraggingCharContainer && <span className="text-xs text-yellow-400 animate-pulse">Drop to fill all slots</span>}
          </h3>
          <div 
            className={`
              grid grid-cols-2 gap-4 transition-all rounded-xl p-2 -m-2
              ${isDraggingCharContainer ? 'bg-yellow-400/10 border-2 border-dashed border-yellow-400' : 'border-2 border-transparent'}
            `}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingCharContainer(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDraggingCharContainer(false); }}
            onDrop={(e) => handleBatchDrop(e, 'character')}
          >
            {characters.map((char, index) => (
              <CharacterSlot
                key={char.id}
                index={index}
                character={char}
                onUpdate={onUpdateCharacter}
                onRemove={onRemoveCharacter}
              />
            ))}
          </div>
        </section>
      )}

      {/* 2. Prompts Section */}
      <section className="space-y-4">
        
        {/* Constant Prompt */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" /> Constant Prompt
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{constantPrompt.length} chars</span>
          </h3>
          <div className="relative">
            <textarea
              value={constantPrompt}
              onChange={(e) => onConstantPromptChange(e.target.value)}
              placeholder="System Rules: Define the core art style, lighting, and material properties that apply to every image generated."
              className="w-full h-24 bg-slate-900/50 border border-blue-900/50 focus:border-blue-500/50 rounded-xl p-3 text-xs text-slate-300 placeholder-slate-600 outline-none resize-none transition-all font-mono leading-relaxed"
            />
          </div>
        </div>

        {/* Positive Prompt */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-400" /> Positive Prompt
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{positivePrompt.length} chars</span>
          </h3>
          <div className="relative">
            <textarea
              value={positivePrompt}
              onChange={(e) => onPositivePromptChange(e.target.value)}
              placeholder="Description: A cute 3D robot gardener watering neon plants in a futuristic greenhouse, cinematic lighting, 8k..."
              className="w-full h-32 bg-slate-800 border border-slate-700 focus:border-green-500/50 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 outline-none resize-none transition-all focus:ring-1 focus:ring-green-500/20"
            />
          </div>
        </div>

        {/* Negative Prompt */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-400" /> Negative Prompt
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{negativePrompt.length} chars</span>
          </h3>
          <div className="relative">
            <textarea
              value={negativePrompt}
              onChange={(e) => onNegativePromptChange(e.target.value)}
              placeholder="Avoid: 2d, sketch, bad anatomy, text, blur..."
              className="w-full h-20 bg-slate-900/50 border border-red-900/30 focus:border-red-500/50 rounded-xl p-3 text-xs text-slate-300 placeholder-slate-600 outline-none resize-none transition-all"
            />
          </div>
        </div>

      </section>

      {/* 3. Image Style Reference - AVAILABLE IN BOTH MODES */}
      <section>
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
             <Palette className="w-4 h-4 text-purple-400" />
             Style References
             <span className="text-[10px] text-slate-500 font-normal">
               ({styleReferences.filter(r => r.base64).length}/12)
             </span>
          </div>
          <div className="flex items-center gap-2">
            {isDraggingStyleContainer && <span className="text-xs text-yellow-400 animate-pulse">Drop to fill all slots</span>}
            {styleReferences.some(r => r.base64) && (
              <button
                onClick={() => {
                  styleReferences.forEach(ref => {
                    if (ref.base64) onRemoveStyleRef(ref.id);
                  });
                }}
                className="text-[10px] text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
                title="Remove all style references"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </h3>

        {/* Scrollable container with all 12 slots */}
        <div
          className={`
             overflow-x-auto pb-2 custom-scrollbar transition-all rounded-xl p-2 -m-2
             ${isDraggingStyleContainer ? 'bg-yellow-400/10 border-2 border-dashed border-yellow-400' : 'border-2 border-transparent'}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingStyleContainer(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDraggingStyleContainer(false); }}
          onDrop={(e) => handleBatchDrop(e, 'style')}
        >
          <div className="grid grid-cols-6 gap-2 min-w-[400px]">
            {styleReferences.map((ref) => (
              <StyleRefSlot
                key={ref.id}
                styleRef={ref}
                onUpdate={onUpdateStyleRef}
                onRemove={onRemoveStyleRef}
                onBulkUpdate={(files) => {
                  // Fill empty slots with selected files
                  const emptySlots = styleReferences.filter(r => !r.base64);
                  files.forEach((file, index) => {
                    if (index < emptySlots.length) {
                      onUpdateStyleRef(emptySlots[index].id, file);
                    }
                  });
                }}
                allowMultiple={!ref.base64}
              />
            ))}
          </div>
        </div>

        <p className="text-[10px] text-slate-500 mt-2">Click any empty slot to select multiple images at once.</p>
      </section>

      {/* 4. Output Settings */}
      <section>
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Output Settings
        </h3>
        
        <div className="space-y-4">
          {/* Quality Selection */}
          <div>
            <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-slate-400">Quality</label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {qualities.map(q => (
                <button
                    key={q}
                    onClick={() => onQualityChange(q)}
                    className={`
                        w-full py-2 rounded-lg text-sm font-medium transition-all
                        ${quality === q
                        ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        }
                    `}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Dimension Selection */}
          <div>
            <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-slate-400">Dimensions</label>
            </div>
            
            <div className="flex flex-col gap-2">
               
               {/* Aspect Ratio Block */}
               <div className={`
                   rounded-lg border transition-all
                   ${!isCustomRatio ? 'bg-slate-800 border-slate-700' : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'}
               `}>
                   <label className="flex items-center gap-3 p-3 cursor-pointer w-full">
                       <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${!isCustomRatio ? 'border-yellow-400' : 'border-slate-600'}`}>
                           {!isCustomRatio && <div className="w-2 h-2 rounded-full bg-yellow-400" />}
                       </div>
                       <input 
                           type="radio" 
                           name="dimensionType" 
                           checked={!isCustomRatio} 
                           onChange={() => setIsCustomRatio(false)} 
                           className="hidden" 
                       />
                       <span className={`text-xs font-medium ${!isCustomRatio ? 'text-slate-200' : 'text-slate-500'}`}>Use Aspect Ratio</span>
                   </label>
                   
                   {!isCustomRatio && (
                       <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2 fade-in duration-200">
                           <div className="grid grid-cols-3 gap-2 mt-1">
                                {standardRatios.map(r => (
                                  <button
                                      key={r}
                                      onClick={() => onAspectRatioChange(r)}
                                      className={`
                                          w-full py-2.5 px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 relative
                                          ${aspectRatio === r
                                          ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20'
                                          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                          }
                                      `}
                                  >
                                      <div className="h-6 flex items-center justify-center">
                                          <div
                                              className={`
                                                  border-[1.5px] rounded-[1px]
                                                  ${aspectRatio === r ? 'border-black' : 'border-current'}
                                                  ${getAspectRatioVisualClass(r)}
                                              `}
                                          />
                                      </div>
                                      <div className="flex flex-col items-center leading-none">
                                          <span className="text-xs font-bold">{r}</span>
                                      </div>
                                      {/* Resolution Badge */}
                                      <div className={`text-[8px] font-mono font-medium px-1.5 py-0.5 rounded ${
                                        aspectRatio === r
                                          ? 'bg-black/20 text-black'
                                          : 'bg-slate-600/50 text-slate-400'
                                      }`}>
                                        {getResolutionDisplay(quality, r)}
                                      </div>
                                  </button>
                                ))}
                           </div>
                           {/* Selected Resolution Info */}
                           <div className="mt-3 p-2 bg-slate-900/50 rounded-lg border border-slate-700/50 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <div className={`border-2 border-yellow-400 rounded-sm ${getAspectRatioVisualClass(aspectRatio)}`} />
                               <span className="text-xs text-slate-400">Selected:</span>
                               <span className="text-sm font-bold text-yellow-400">{aspectRatio}</span>
                             </div>
                             <div className="flex items-center gap-2">
                               <span className="text-xs font-mono font-bold text-green-400">
                                 {getResolutionDisplay(quality, aspectRatio)}
                               </span>
                               <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                 quality === '4K' ? 'bg-orange-500/20 text-orange-400' : quality === '2K' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                               }`}>{quality}</span>
                             </div>
                           </div>
                       </div>
                   )}
               </div>

               {/* Custom Resolution Block */}
               <div className={`
                   rounded-lg border transition-all group
                   ${isCustomRatio ? 'bg-slate-800 border-slate-700' : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'}
               `}>
                   {/* Header Row: Radio + Label + Reset Button (Moved OUTSIDE label) */}
                   <div className="flex items-center justify-between p-3 w-full">
                       <label className="flex items-center gap-3 cursor-pointer">
                           <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isCustomRatio ? 'border-yellow-400' : 'border-slate-600'}`}>
                               {isCustomRatio && <div className="w-2 h-2 rounded-full bg-yellow-400" />}
                           </div>
                           <input 
                               type="radio" 
                               name="dimensionType" 
                               checked={isCustomRatio} 
                               onChange={() => setIsCustomRatio(true)} 
                               className="hidden" 
                           />
                           <span className={`text-xs font-medium ${isCustomRatio ? 'text-slate-200' : 'text-slate-500'}`}>Custom Resolution</span>
                       </label>
                       
                       {/* Reset Button */}
                       {isCustomRatio && (customWidth || customHeight) && (
                         <button
                            onClick={handleResetResolution}
                            className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded-md transition-all"
                            title="Reset Inputs"
                         >
                            <RotateCcw className="w-3.5 h-3.5" />
                         </button>
                       )}
                   </div>
                   
                   {isCustomRatio && (
                       <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2 fade-in duration-200">
                           <div className="space-y-3 mt-1">
                              
                              {/* Input Fields Row with Button */}
                              <div className="flex items-end gap-2">
                                  <div className="flex-1">
                                      <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Width</label>
                                      <input
                                          type="number"
                                          value={customWidth}
                                          onChange={handleWidthChange}
                                          placeholder="1920"
                                          max="9999"
                                          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-200 placeholder-slate-600 focus:border-yellow-500 outline-none transition-colors font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                  </div>
                                  <div className="pb-2 text-slate-600 font-bold">×</div>
                                  <div className="flex-1">
                                      <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Height</label>
                                      <input
                                          type="number"
                                          value={customHeight}
                                          onChange={handleHeightChange}
                                          placeholder="1080"
                                          max="9999"
                                          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-200 placeholder-slate-600 focus:border-yellow-500 outline-none transition-colors font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                  </div>

                                  {/* Save Button */}
                                  <div className="pb-[1px]">
                                    {!isAlreadySaved ? (
                                        <button
                                            onClick={handleSaveResolution}
                                            disabled={!customWidth || !customHeight}
                                            className={`
                                                w-[34px] h-[34px] rounded flex items-center justify-center transition-all
                                                ${customWidth && customHeight
                                                ? 'bg-yellow-400 text-slate-950 hover:bg-yellow-300 shadow-md shadow-yellow-400/10'
                                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed hover:bg-slate-800 hover:text-slate-500'
                                                }
                                            `}
                                            title="Save to Presets"
                                        >
                                            <Save className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <div 
                                            className="w-[34px] h-[34px] rounded flex items-center justify-center bg-green-500/10 border border-green-500/20 text-green-500"
                                            title="Saved"
                                        >
                                            <Check className="w-4 h-4" />
                                        </div>
                                    )}
                                  </div>
                              </div>
                              
                              {/* Feedback Message */}
                              {savedResolutionMsg ? (
                                <p className="text-[10px] text-green-400 mt-1 flex items-center justify-center gap-1.5 animate-in fade-in duration-300">
                                   <Check className="w-3 h-3" />
                                   {savedResolutionMsg}
                                </p>
                              ) : isAlreadySaved && isActive ? (
                                <p className="text-[10px] text-slate-400 mt-1 text-center font-mono">
                                   Active: {currentResString}
                                </p>
                              ) : null}

                              {/* Detected Ratio & Output Resolution Display */}
                              {detectedRatio && (
                                <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500">Ratio:</span>
                                    <span className="text-sm font-bold text-yellow-400">{detectedRatio}</span>
                                    <div className={`border-2 border-yellow-400 rounded-sm ${
                                      detectedRatio === '1:1' ? 'w-4 h-4' :
                                      detectedRatio === '16:9' ? 'w-6 h-3.5' :
                                      detectedRatio === '9:16' ? 'w-3.5 h-6' :
                                      detectedRatio === '4:3' ? 'w-5 h-4' :
                                      detectedRatio === '3:4' ? 'w-4 h-5' : 'w-4 h-4'
                                    }`} />
                                  </div>
                                  {outputResolution && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-slate-500">Output:</span>
                                      <span className="text-xs font-mono font-bold text-green-400">{outputResolution}</span>
                                      <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                                        quality === '4K' ? 'bg-orange-500/20 text-orange-400' : quality === '2K' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                      }`}>{quality}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Saved Resolutions Slider */}
                              {sortedSavedResolutions.length > 0 && (
                                <div className="border-t border-slate-700/50 pt-3 mt-3 animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block flex justify-between">
                                        <span>Saved</span>
                                        {(customWidth || customHeight) && <span className="text-slate-600 text-[9px]">Filter active</span>}
                                    </label>
                                    <div 
                                      ref={scrollContainerRef}
                                      className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar"
                                    >
                                        {sortedSavedResolutions.map(res => {
                                            const [w, h] = res.split('x');
                                            
                                            // Exact Match: Both inputs match resolution exactly
                                            const isExactMatch = customWidth === w && customHeight === h;

                                            // Partial Match logic...
                                            const hasInput = customWidth !== '' || customHeight !== '';
                                            const widthMatch = customWidth === '' || w.startsWith(customWidth);
                                            const heightMatch = customHeight === '' || h.startsWith(customHeight);
                                            const isPartialMatch = hasInput && widthMatch && heightMatch;
                                            
                                            return (
                                            <div key={res} 
                                                 onClick={() => {
                                                    setCustomWidth(w);
                                                    setCustomHeight(h);
                                                    onAspectRatioChange(res);
                                                    setSavedResolutionMsg(`Active: ${res}`);
                                                 }}
                                                 className={`
                                                    flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0 cursor-pointer transition-all group relative pr-7
                                                    ${isExactMatch 
                                                        ? 'bg-yellow-400 text-black border-yellow-400 font-bold shadow-md shadow-yellow-400/20' 
                                                        : isPartialMatch
                                                            ? 'bg-transparent border-yellow-400 text-yellow-400'
                                                            : !hasInput && aspectRatio === res
                                                                ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                                                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                                    }
                                                 `}
                                            >
                                                <span className="text-xs font-mono font-medium">{res}</span>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeSavedResolution(res);
                                                    }}
                                                    className={`
                                                        absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all opacity-0 group-hover:opacity-100
                                                        ${isExactMatch ? 'hover:bg-black/10 hover:text-red-600' : 'hover:bg-red-500/20 hover:text-red-400'}
                                                    `}
                                                    title="Remove"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                              )}
                           </div>
                       </div>
                   )}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Reference Background - ONLY IN IMAGE TO IMAGE MODE */}
      {generationMode === 'image-to-image' && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Reference Background</h3>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div 
              onClick={() => bgInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative w-full h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden
                ${isDraggingBg ? 'border-yellow-400 bg-slate-700' : ''}
                ${background.previewUrl ? 'border-yellow-400/50 bg-slate-900' : 'border-slate-600 hover:border-slate-400 hover:bg-slate-700/50'}
                ${!isDraggingBg && !background.previewUrl ? '' : ''} 
              `}
            >
               {background.previewUrl ? (
                  <>
                    <img src={background.previewUrl} alt="Background" className="w-full h-full object-cover opacity-60" />
                    
                    {/* Remove Button */}
                    <div 
                      className="absolute top-2 right-2 p-1 bg-black/40 backdrop-blur-sm rounded-full cursor-pointer hover:bg-red-500/80 transition-colors z-20 group"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveBackground();
                      }}
                      title="Remove Background"
                    >
                      <Trash2 className="w-4 h-4 text-white/70 group-hover:text-white" />
                    </div>
                  </>
               ) : (
                 <>
                   <ImageIcon className={`w-8 h-8 text-slate-400 mb-2 ${isDraggingBg ? 'text-yellow-400 animate-bounce' : ''}`} />
                   <span className={`text-xs ${isDraggingBg ? 'text-yellow-400' : 'text-slate-400'}`}>
                      {isDraggingBg ? 'Drop Image Here' : 'Click or Drop to upload background'}
                   </span>
                 </>
               )}
               
               {background.previewUrl && !isDraggingBg && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-slate-900/80 rounded-full px-3 py-1 flex items-center gap-1">
                       <Upload className="w-3 h-3 text-white" /> 
                       <span className="text-xs text-white">Change</span>
                    </div>
                  </div>
               )}
            </div>
            <input 
              type="file" 
              ref={bgInputRef} 
              onChange={handleBgChange} 
              accept="image/*" 
              className="hidden" 
            />
            
            <div className="mt-3 flex items-center justify-between">
              <label className="text-sm text-slate-300 flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={background.useBackground} 
                  onChange={onToggleUseBackground}
                  className="w-4 h-4 rounded border-slate-600 text-yellow-500 focus:ring-yellow-500/50 bg-slate-700"
                  disabled={!background.previewUrl}
                />
                Use this background
              </label>
              <span className="text-xs text-slate-500">
                {background.useBackground ? 'Preserve Environment' : 'Reference Only'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 6. Action Button */}
      <div className="sticky bottom-0 pt-4 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent">
        <button
          onClick={onGenerate}
          disabled={isGenerating || !positivePrompt.trim()}
          className={`
            w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all
            ${isGenerating || !positivePrompt.trim()
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
              : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 hover:shadow-yellow-400/20 hover:scale-[1.02] active:scale-[0.98]'
            }
          `}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
              Generating World...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Image
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;