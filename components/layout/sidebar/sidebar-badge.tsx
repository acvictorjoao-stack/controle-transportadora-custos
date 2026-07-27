'use client';

import {Badge} from '@/components/ui/badge';
import {cn} from '@/lib/utils';

export interface SidebarBadgeProps {
  value?: string | number | null;
  className?: string;
  /** Variante visual — counts usam default; "Em breve" usa secondary */
  tone?: 'count' | 'label';
}

/**
 * Badge padronizado da sidebar (RC 28.0.3).
 * Labels como "Em breve" usam estilo secundário compacto.
 */
function SidebarBadge({value, className, tone = 'label'}: SidebarBadgeProps) {
  if (value === null || value === undefined || value === '') return null;

  const isCount = tone === 'count' || typeof value === 'number';
  const isComingSoon =
    !isCount && String(value).trim().toLowerCase() === 'em breve';

  return (
    <Badge
      data-slot="sidebar-badge"
      variant={isCount ? 'default' : 'secondary'}
      className={cn(
        'shrink-0 rounded-md px-1.5 py-0 text-[10px] font-medium leading-4 tracking-wide',
        isCount && 'min-w-5 justify-center tabular-nums',
        isComingSoon && 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {isComingSoon ? 'Em breve' : value}
    </Badge>
  );
}

export {SidebarBadge};
