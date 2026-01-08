import React, { useState, useEffect } from 'react';
import { GeneratedImage, ImageQuality, AspectRatio } from '../types';
import { Download, Maximize2, X, Trash2, History, Check, CheckSquare, Square, Sparkles } from 'lucide-react';

interface ResultPanelProps {
  images: GeneratedImage[];
  onClearHistory?: () => void;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ images, onClearHistory }) => {
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  // Automatically select the newest image when it arrives
  useEffect(() => {
    if (images.length > 0) {
      const newestId = images[0].id;
      if (activeImageId !== newestId) {
         setActiveImageId(newestId);
      }
    }
  }, [images]);

  const activeImage = images.find(img => img.id === activeImageId) || images[0];

  // Filter out loading images for history
  const completedImages = images.filter(img => !img.isLoading && img.url);

  const handleDownload = (url: string, id: string, prompt?: string) => {
    const link = document.createElement('a');
    link.href = url;
    // Create filename from prompt or use id
    const filename = prompt
      ? prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')
      : id;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Truncate prompt for display
  const truncatePrompt = (text: string | undefined, maxLength: number = 80) => {
    if (!text) return "Untitled";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  // Selection handlers
  const toggleImageSelection = (id: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllImages = () => {
    if (selectedImages.size === completedImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(completedImages.map(img => img.id)));
    }
  };

  const downloadSelected = () => {
    const selected = completedImages.filter(img => selectedImages.has(img.id));
    selected.forEach((img, index) => {
      setTimeout(() => {
        handleDownload(img.url, img.id, img.prompt);
      }, index * 200); // Stagger downloads
    });
  };

  const downloadAll = () => {
    completedImages.forEach((img, index) => {
      setTimeout(() => {
        handleDownload(img.url, img.id, img.prompt);
      }, index * 200);
    });
  };

  return (
    <div className="h-full flex bg-slate-900/30 rounded-2xl border border-slate-800/50 overflow-hidden relative shadow-2xl">

      {/* --- Main Preview Area --- */}
      <div className="flex-1 flex flex-col relative bg-slate-950/50">

        {/* Header Bar with Title and Actions */}
        <div className="h-16 border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-3 overflow-hidden flex-1">
                <Sparkles className="w-5 h-5 text-yellow-500 shrink-0 self-start mt-1" />
                <div className="flex flex-col overflow-hidden min-w-0">
                    <h2 className="font-bold text-slate-200 text-sm md:text-base leading-tight" title={activeImage?.prompt}>
                        {truncatePrompt(activeImage?.prompt, 80)}
                    </h2>
                    {activeImage?.resolution && (
                        <span className="text-[10px] text-slate-500 font-mono font-medium mt-0.5">
                            {activeImage.resolution}
                        </span>
                    )}
                </div>
                {activeImage?.isLoading && (
                    <span className="ml-2 text-[10px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded font-mono animate-pulse shrink-0 self-start">
                        PROCESSING
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                 {/* Main Actions (visible if active image exists and done) */}
                 {activeImage && !activeImage.isLoading && activeImage.url && (
                     <div className="flex items-center gap-1 border-r border-slate-700/50 pr-2 mr-1">
                        <button
                            onClick={() => setIsPreviewModalOpen(true)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Fullscreen"
                        >
                            <Maximize2 className="w-5 h-5" />
                        </button>
                        {/* Download Resized */}
                        <button
                            onClick={() => handleDownload(activeImage.url, activeImage.id, activeImage.prompt ? `${activeImage.prompt}_resized` : undefined)}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                            title={`Download Resized (${activeImage.resolution})`}
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Resized</span>
                        </button>
                        {/* Download Original */}
                        {activeImage.originalUrl && (
                          <button
                              onClick={() => handleDownload(activeImage.originalUrl!, activeImage.id, activeImage.prompt ? `${activeImage.prompt}_original` : undefined)}
                              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                              title={`Download Original (${activeImage.originalResolution})`}
                          >
                              <Download className="w-4 h-4" />
                              <span className="hidden sm:inline">Original</span>
                          </button>
                        )}
                     </div>
                 )}

                 {/* History Button */}
                 <button
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                    title="View History"
                 >
                    <History className="w-4 h-4" />
                    History
                    {completedImages.length > 0 && (
                      <span className="bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {completedImages.length}
                      </span>
                    )}
                 </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden relative">
            {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-600 gap-4">
                    <div className="p-6 bg-slate-800/30 rounded-full border-2 border-dashed border-slate-800">
                        <Maximize2 className="w-12 h-12 opacity-50" />
                    </div>
                    <p className="font-medium text-sm">Create your first masterpiece</p>
                </div>
            ) : activeImage ? (
                <div className="relative w-full h-full flex items-center justify-center group">
                    {activeImage.isLoading ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"></div>
                            <span className="text-yellow-400 font-medium animate-pulse text-lg">Rendering Scene...</span>
                        </div>
                    ) : (
                        <div className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-800/50" style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 220px)' }}>
                             <img
                                src={activeImage.url}
                                alt="Active Result"
                                className="block w-auto h-auto"
                                style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 220px)', objectFit: 'contain' }}
                             />
                             {/* Floating Metadata (Bottom Left) */}
                             <div className="absolute bottom-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-black/70 backdrop-blur-md text-white px-2 py-1 rounded text-xs border border-white/10 font-mono">
                                    {activeImage.quality}
                                </span>
                                <span className="bg-black/70 backdrop-blur-md text-white px-2 py-1 rounded text-xs border border-white/10 font-mono">
                                    {activeImage.resolution}
                                </span>
                             </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-slate-500">Select an image from history</div>
            )}
        </div>
      </div>

      {/* Generation History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-slate-400" />
                <h2 className="text-xl font-bold text-white">Generation History</h2>
              </div>
              <button
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  setSelectedImages(new Set());
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Toolbar */}
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-lg">
                  {completedImages.length} items
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Select All */}
                <button
                  onClick={selectAllImages}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {selectedImages.size === completedImages.length && completedImages.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  Select All
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-5 py-3 border-b border-slate-800 flex gap-3">
              <button
                onClick={downloadSelected}
                disabled={selectedImages.size === 0}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all border ${
                  selectedImages.size > 0
                    ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                    : 'bg-slate-800/50 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" />
                Save ({selectedImages.size})
              </button>
              <button
                onClick={downloadAll}
                disabled={completedImages.length === 0}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  completedImages.length > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" />
                Save All
              </button>
            </div>

            {/* Grid of Images */}
            <div className="flex-1 overflow-y-auto p-5">
              {completedImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <History className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">No generation history</p>
                  <p className="text-sm text-slate-600 mt-1">Generated images will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {completedImages.map((img) => (
                    <div
                      key={img.id}
                      className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                        selectedImages.has(img.id)
                          ? 'border-blue-500 ring-2 ring-blue-500/30'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                      onClick={() => toggleImageSelection(img.id)}
                    >
                      {/* Image */}
                      <div className="aspect-square bg-slate-800">
                        <img
                          src={img.url}
                          alt={img.prompt}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Selection Indicator */}
                      <div className={`absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                        selectedImages.has(img.id)
                          ? 'bg-blue-500'
                          : 'bg-black/50 opacity-0 group-hover:opacity-100'
                      }`}>
                        {selectedImages.has(img.id) && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>

                      {/* Title */}
                      <div className="p-2 bg-slate-800/90">
                        <p className="text-xs text-slate-300 truncate" title={img.prompt}>
                          {truncatePrompt(img.prompt, 25)}
                        </p>
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {/* View Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageId(img.id);
                            setIsHistoryModalOpen(false);
                            setSelectedImages(new Set());
                          }}
                          className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                        >
                          View
                        </button>
                        {/* Download Resized Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(img.url, img.id, img.prompt ? `${img.prompt}_resized` : undefined);
                          }}
                          className="bg-yellow-500/80 backdrop-blur-sm text-black px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-400 transition-colors flex items-center gap-1"
                          title={`Resized (${img.resolution})`}
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-xs">R</span>
                        </button>
                        {/* Download Original Button */}
                        {img.originalUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(img.originalUrl!, img.id, img.prompt ? `${img.prompt}_original` : undefined);
                            }}
                            className="bg-green-500/80 backdrop-blur-sm text-black px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-400 transition-colors flex items-center gap-1"
                            title={`Original (${img.originalResolution})`}
                          >
                            <Download className="w-4 h-4" />
                            <span className="text-xs">O</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with Clear History */}
            {completedImages.length > 0 && onClearHistory && (
              <div className="px-5 py-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all history?')) {
                      onClearHistory();
                      setIsHistoryModalOpen(false);
                      setSelectedImages(new Set());
                    }
                  }}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear History
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Screen Preview Modal */}
      {isPreviewModalOpen && activeImage && !activeImage.isLoading && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <button
            onClick={() => setIsPreviewModalOpen(false)}
            className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors bg-white/10 rounded-full hover:bg-white/20"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-4">
              <img
                src={activeImage.url}
                alt="Full Preview"
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              <div className="text-center">
                  <h3 className="text-white font-medium text-lg max-w-3xl mx-auto">
                    {activeImage.prompt}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mt-2 text-slate-400 text-sm">
                      <span>{activeImage.quality}</span>
                      <span>•</span>
                      <span>{activeImage.resolution}</span>
                  </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultPanel;
