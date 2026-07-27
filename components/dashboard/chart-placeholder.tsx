import {BarChart3} from 'lucide-react';

import {EmptyState} from '@/components/common/empty-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {cn} from '@/lib/utils';

export interface ChartPlaceholderProps {
  title: string;
  description: string;
  /** @deprecated Mantido por compatibilidade — não renderiza série fictícia. */
  variant?: 'bar' | 'line' | 'area';
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * Card de gráfico sem série simulada.
 * Exibe empty state até haver dados reais.
 */
function ChartPlaceholder({
  title,
  description,
  className,
  emptyTitle = 'Nenhum dado disponível para gerar o gráfico.',
  emptyDescription = 'Os valores aparecerão quando houver dados no período selecionado.',
}: ChartPlaceholderProps) {
  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={<BarChart3 className="size-6" />}
          title={emptyTitle}
          description={emptyDescription}
          className="py-12"
        />
      </CardContent>
    </Card>
  );
}

export {ChartPlaceholder};
