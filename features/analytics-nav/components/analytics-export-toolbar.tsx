'use client';

import {FileSpreadsheet, FileText, Link2, Share2} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import {Button, buttonVariants} from '@/components/ui/button';
import {useToast} from '@/contexts/feedback/toast-context';
import {cn} from '@/lib/utils';

import type {AnalyticsExportPayload, SharedAnalyticsFilters} from '../types';
import {
  copyShareableAnalyticsUrl,
  exportAnalyticsExcel,
  exportAnalyticsPdf,
} from '../utils/export-analytics';
import {buildSharedAnalyticsUrl} from '../utils/shared-filters';

export interface AnalyticsExportToolbarProps {
  filters: SharedAnalyticsFilters;
  basePath: string;
  filenameBase: string;
  payload: AnalyticsExportPayload;
  className?: string;
  /** Links de navegação cruzada extras (ex.: Abrir Rotas). */
  crossLinks?: Array<{label: string; href: string}>;
}

function AnalyticsExportToolbar({
  filters,
  basePath,
  filenameBase,
  payload,
  className,
  crossLinks = [],
}: AnalyticsExportToolbarProps) {
  const toast = useToast();
  const [sharing, setSharing] = React.useState(false);

  const shareUrl = React.useMemo(() => {
    const path = buildSharedAnalyticsUrl(filters, basePath);
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path}`;
  }, [basePath, filters]);

  const handleShare = async () => {
    setSharing(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: payload.title,
            url: shareUrl,
          });
          toast.success('Link compartilhado');
          return;
        } catch {
          // cancelado — tenta clipboard
        }
      }

      const ok = await copyShareableAnalyticsUrl(shareUrl);
      if (ok) toast.success('Link com filtros copiado');
      else toast.error('Não foi possível copiar o link');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-wrap gap-2">
        {crossLinks.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            className={cn(buttonVariants({variant: 'outline', size: 'sm'}))}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => exportAnalyticsExcel(payload, filenameBase)}
        >
          <FileSpreadsheet className="size-4" />
          Excel
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => exportAnalyticsPdf(payload, filenameBase)}
        >
          <FileText className="size-4" />
          PDF
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleShare}
          disabled={sharing}
        >
          <Share2 className="size-4" />
          Compartilhar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={async () => {
            const ok = await copyShareableAnalyticsUrl(shareUrl);
            if (ok) toast.success('URL copiada');
            else toast.error('Falha ao copiar URL');
          }}
          aria-label="Copiar link"
        >
          <Link2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export {AnalyticsExportToolbar};
