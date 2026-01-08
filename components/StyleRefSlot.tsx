import React, { useRef, useState } from 'react';
import { StyleReference } from '../types';
import { Plus, X, Image as ImageIcon } from 'lucide-react';

interface StyleRefSlotProps {
  styleRef: StyleReference;
  onUpdate: (id: number, file: File) => void;
  onRemove: (id: number) => void;
  onBulkUpdate?: (files: File[]) => void;
  allowMultiple?: boolean;
}

const StyleRefSlot: React.FC<StyleRefSlotProps> = ({ styleRef, onUpdate, onRemove, onBulkUpdate, allowMultiple }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (allowMultiple && e.target.files.length > 1 && onBulkUpdate) {
        // Multiple files selected - use bulk update
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        onBulkUpdate(files);
      } else {
        // Single file - use regular update
        onUpdate(styleRef.id, e.target.files[0]);
      }
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // If multiple files are dropped, let the event bubble to the container for batch handling
    if (e.dataTransfer.files.length > 1) {
      return;
    }

    // Stop propagation for single file to handle it specifically for this slot
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onUpdate(styleRef.id, file);
      }
    }
  };

  // Handle paste events to support pasting images from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        onUpdate(styleRef.id, file);
      }
    }
  };

  return (
    <div 
      className={`
        relative aspect-square rounded-lg border-2 border-dashed transition-all cursor-pointer overflow-hidden group
        ${styleRef.previewUrl ? 'border-transparent bg-black' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}
        ${isDragging ? 'border-yellow-400 bg-slate-700' : ''}
      `}
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0} // Make focusable for paste
    >
      {styleRef.previewUrl ? (
        <>
          <img 
            src={styleRef.previewUrl} 
            alt="Style Ref" 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(styleRef.id);
            }}
            className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white/70 hover:text-white hover:bg-red-500/80 transition-all opacity-0 group-hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-1">
          {isDragging ? (
            <ImageIcon className="w-5 h-5 text-yellow-400 animate-bounce" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple={allowMultiple}
        className="hidden"
      />
    </div>
  );
};

export default StyleRefSlot;