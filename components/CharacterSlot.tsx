import React, { useRef, useState } from 'react';
import { Character } from '../types';
import { Plus, Trash2, RefreshCcw } from 'lucide-react';

interface CharacterSlotProps {
  character: Character;
  index: number;
  onUpdate: (id: number, file: File) => void;
  onRemove: (id: number) => void;
}

const CharacterSlot: React.FC<CharacterSlotProps> = ({ character, index, onUpdate, onRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpdate(character.id, e.target.files[0]);
    }
    // Reset value to allow re-uploading the same file if needed (though onUpdate handles replacing)
    e.target.value = '';
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
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
        onUpdate(character.id, file);
      }
    }
  };

  const hasImage = !!character.previewUrl;

  return (
    <div className={`relative flex flex-col items-center group transition-all duration-300`}>
      <div 
        className={`
          relative w-full aspect-[3/4] rounded-xl overflow-hidden cursor-pointer border-2 transition-all
          ${hasImage ? 'border-yellow-400/70 shadow-[0_0_15px_rgba(250,204,21,0.1)]' : 'border-slate-700 hover:border-slate-500'}
          ${isDragging ? 'border-yellow-400 bg-slate-700 scale-105' : 'bg-slate-800'}
        `}
        onClick={triggerUpload}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {character.previewUrl ? (
          <>
            <img 
              src={character.previewUrl} 
              alt={`Character ${index + 1}`} 
              className="w-full h-full object-cover"
            />
            {/* Overlay on hover */}
            <div className={`absolute inset-0 bg-black/50 ${isDragging ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2`}>
               <RefreshCcw className={`w-8 h-8 ${isDragging ? 'text-yellow-400' : 'text-white'} mb-1`} />
               <span className="text-xs font-medium text-white">{isDragging ? 'Drop to replace' : 'Change Image'}</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <Plus className={`w-8 h-8 ${isDragging ? 'text-yellow-400 animate-bounce' : ''}`} />
            <span className={`text-sm font-medium ${isDragging ? 'text-yellow-400' : ''}`}>
               {isDragging ? 'Drop Image' : `Upload Char ${index + 1}`}
            </span>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      
      {/* Label */}
      <div className="mt-2 text-center w-full flex justify-between items-center px-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Character {index + 1}</span>
        {character.previewUrl && (
          <button 
             onClick={(e) => {
               e.stopPropagation();
               onRemove(character.id);
             }}
             className="text-slate-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CharacterSlot;