"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
}

export function TagInput({ value, onChange, placeholder = "输入后按 Enter 添加", maxTags = 20, disabled }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (value.length >= maxTags) return;
    if (value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(inputValue);
      setInputValue("");
    }
    if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  return (
    <div className="w-full bg-muted border-none rounded-md px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-primary/30 transition-colors">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag, i) => (
          <span key={`${tag}-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs bg-primary/10 text-primary">
            {tag}
            {!disabled && (
              <button type="button" onClick={() => removeTag(i)} className="hover:text-destructive transition-colors ml-0.5">
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        {!disabled && value.length < maxTags && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/40"
          />
        )}
      </div>
    </div>
  );
}
