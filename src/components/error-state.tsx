import { AlertTriangle, RefreshCw } from 'lucide-react';

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">加载失败</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{message || '请求失败，请稍后重试'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          重试
        </button>
      )}
    </div>
  );
}
