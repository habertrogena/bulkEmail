"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RecipientDropzoneProps {
  onFile: (csv: string) => void;
  disabled?: boolean;
  isUploading?: boolean;
}

export function RecipientDropzone({ onFile, disabled, isUploading }: RecipientDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => onFile(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
          : "cursor-pointer border-slate-300 text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/50",
        isDragging && "border-indigo-500 bg-indigo-50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) readFile(file);
          e.target.value = "";
        }}
      />
      <p className="text-sm font-medium">
        {isUploading
          ? "Uploading..."
          : disabled
            ? "Save the draft first to add recipients"
            : "Drag and drop a CSV file here, or click to browse"}
      </p>
      {!disabled && (
        <p className="mt-1 text-xs text-slate-500">
          Must include an &quot;email&quot; column. Other columns become merge fields.
        </p>
      )}
    </div>
  );
}
