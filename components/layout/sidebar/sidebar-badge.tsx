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
 * Badge reutilizável da sidebar (texto ou contagem futura).
 * Nesta RC não há integração com APIs de contagem.
 */
function SidebarBadge({value, className, tone = 'label'}: SidebarBadgeProps) {
  if (value === null || value === undefined || value === '') return null;

  const isCount = tone === 'count' || typeof value === 'number';

  return (
    <Badge
      data-slot="sidebar-badge"
      variant={isCount ? 'default' : 'secondary'}
      className={cn(
        'shrink-0 px-1.5 py-0 text-[10px] font-medium leading-4',
        isCount && 'min-w-5 justify-center tabular-nums',
        className,
      )}
    >
      {value}
    </Badge>
  );
}

export {SidebarBadge};
