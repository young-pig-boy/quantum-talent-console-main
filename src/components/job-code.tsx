"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * JobCode — 岗位编码展示（只读，支持一键复制）。
 * 岗位编码是「人类可读业务识别码」，不是 UUID 主键。
 * 意外读取到空值时展示「岗位编号异常」，绝不伪造编号。
 */
export function JobCode({
  code,
  className,
  showCopy = true,
}: {
  code: string | null | undefined;
  className?: string;
  showCopy?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!code) {
    return (
      <span className={cn("font-mono text-xs text-destructive", className)} title="岗位编号异常">
        岗位编号异常
      </span>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时静默失败，不影响展示
    }
  };

  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-xs text-muted-foreground", className)}>
      <span className="tabular-nums whitespace-nowrap" title={code}>
        {code}
      </span>
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center shrink-0 text-muted-foreground/60 hover:text-foreground transition-colors"
          title="复制岗位编号"
          aria-label="复制岗位编号"
        >
          {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
        </button>
      )}
    </span>
  );
}
