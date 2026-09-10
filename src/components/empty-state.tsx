import { FolderOpen } from 'lucide-react';

export function EmptyState({
  title = '暂无数据',
  description,
  action,
  icon,
  size = 'md',
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${size === 'sm' ? 'py-6' : 'py-12'}`}>
      <div className={`mb-3 flex items-center justify-center rounded-full bg-muted ${size === 'sm' ? 'h-9 w-9' : 'h-12 w-12'}`}>
        {icon ?? <FolderOpen className={`text-muted-foreground ${size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'}`} />}
      </div>
      <h3 className={`font-semibold text-foreground ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>{title}</h3>
      {description && <p className={`max-w-xs text-muted-foreground ${size === 'sm' ? 'mt-0.5 text-[10px]' : 'mt-1 text-xs'}`}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
