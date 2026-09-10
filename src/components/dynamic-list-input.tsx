"use client";

import { Plus, Trash2, GripVertical } from "lucide-react";

interface DynamicListInputProps {
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export function DynamicListInput({ value, onChange, placeholder = "输入新条目...", disabled, label }: DynamicListInputProps) {
  const addItem = () => {
    onChange([...value, ""]);
  };

  const updateItem = (index: number, text: string) => {
    const next = [...value];
    next[index] = text;
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      {value.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <div className="flex flex-col items-center pt-1.5 shrink-0">
            <button type="button" onClick={() => moveItem(i, "up")} disabled={i === 0 || disabled} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors leading-none text-xs">▲</button>
            <GripVertical className="w-3 h-3 text-muted-foreground/40" />
            <button type="button" onClick={() => moveItem(i, "down")} disabled={i === value.length - 1 || disabled} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors leading-none text-xs">▼</button>
          </div>
          <span className="text-xs text-muted-foreground pt-2 shrink-0 w-5 text-right">{i + 1}.</span>
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-muted border-none rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors disabled:opacity-50"
          />
          {!disabled && <button type="button" onClick={() => removeItem(i)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      ))}
      {!disabled && (
        <button type="button" onClick={addItem} className="inline-flex items-center gap-1 text-xs text-primary hover:underline transition-colors">
          <Plus className="w-3 h-3" />添加一条
        </button>
      )}
    </div>
  );
}
