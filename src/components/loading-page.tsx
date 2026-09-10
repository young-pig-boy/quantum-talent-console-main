import { Loader2 } from 'lucide-react';

export function LoadingPage({ tip }: { tip?: string }) {
  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        {tip && <p className="text-sm text-muted-foreground">{tip}</p>}
      </div>
    </div>
  );
}
