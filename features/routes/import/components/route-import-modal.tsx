'use client';

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from 'lucide-react';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {Modal} from '@/components/master/shared/modal';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {IMPORT_MAX_FILE_BYTES} from '@/features/import';
import {useToast} from '@/contexts/feedback/toast-context';
import {cn} from '@/lib/utils';

import {
  commitRouteImportAction,
  downloadRouteImportTemplateAction,
  previewRouteImportAction,
} from '../actions';
import {getImportableRouteRows} from '../preview';
import type {RouteImportPreviewResult} from '../types';

export interface RouteImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Step = 'upload' | 'preview' | 'done';

function statusBadge(status: string) {
  if (status === 'valid') {
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle2 className="size-3" /> Válida
      </Badge>
    );
  }
  if (status === 'warning') {
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertCircle className="size-3" /> Atenção
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertCircle className="size-3" /> Inválida
    </Badge>
  );
}

function RouteImportModal({open, onClose, onImported}: RouteImportModalProps) {
  const formKey = `${open}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Importar rotas"
      description="Importe rotas em massa via Excel (.xlsx / .xls)."
      size="xl"
      className="max-w-5xl"
    >
      {open ? (
        <RouteImportContent key={formKey} onClose={onClose} onImported={onImported} />
      ) : null}
    </Modal>
  );
}

function RouteImportContent({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [step, setStep] = React.useState<Step>('upload');
  const [dragging, setDragging] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<
    (RouteImportPreviewResult & {existingMatches: number}) | null
  >(null);
  const [updateExisting, setUpdateExisting] = React.useState(true);
  const [summary, setSummary] = React.useState<{
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  } | null>(null);

  async function handleDownloadTemplate() {
    setLoading(true);
    setError(null);
    const result = await downloadRouteImportTemplateAction();
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? 'Erro ao baixar modelo.');
      return;
    }

    const binary = atob(result.data.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], {type: result.data.mimeType});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.data.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function processFile(file: File) {
    if (file.size > IMPORT_MAX_FILE_BYTES) {
      setError('Arquivo excede o tamanho máximo de 20 MB.');
      return;
    }

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    const result = await previewRouteImportAction(formData);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Erro ao validar planilha.');
      return;
    }

    setPreview(result.data);
    setStep('preview');
  }

  async function handleImport() {
    if (!preview) return;
    const rows = getImportableRouteRows(preview);
    if (rows.length === 0) {
      setError('Não há registros válidos para importar.');
      return;
    }

    setLoading(true);
    setError(null);
    const result = await commitRouteImportAction({
      rows,
      updateExisting,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Erro ao importar registros.');
      return;
    }

    setSummary(result.data);
    setStep('done');
    toast.success(
      `${result.data.created + result.data.updated} registro(s) processado(s).`,
    );
    onImported();
  }

  return (
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'upload' && (
          <>
            <div className="rounded-md border border-border p-4">
              <p className="mb-3 text-sm font-medium">1. Baixar modelo</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                disabled={loading}
              >
                <Download className="size-4" />
                Baixar modelo (.xlsx)
              </Button>
            </div>

            <div
              className={cn(
                'rounded-md border border-dashed p-8 text-center transition-colors',
                dragging ? 'border-primary bg-accent/40' : 'border-border',
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void processFile(file);
              }}
            >
              <FileSpreadsheet className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="mb-1 text-sm font-medium">2. Enviar planilha</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Arraste e solte o arquivo aqui ou selecione manualmente. Máximo 20 MB.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void processFile(file);
                  event.target.value = '';
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Selecionar arquivo
              </Button>
            </div>
          </>
        )}

        {step === 'preview' && preview && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Válidos</p>
                <p className="text-xl font-semibold text-emerald-700">
                  {preview.validCount + preview.warningCount}
                </p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Inválidos</p>
                <p className="text-xl font-semibold text-destructive">
                  {preview.invalidCount}
                </p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-semibold">{preview.totalCount}</p>
              </div>
            </div>

            {preview.existingMatches > 0 && (
              <div className="rounded-md border border-border p-4">
                <p className="mb-2 text-sm font-medium">
                  Atualizar registros existentes? ({preview.existingMatches} encontrados)
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Critério: Origem + Destino + Cliente
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="update-existing"
                      checked={updateExisting}
                      onChange={() => setUpdateExisting(true)}
                    />
                    Sim
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="update-existing"
                      checked={!updateExisting}
                      onChange={() => setUpdateExisting(false)}
                    />
                    Não
                  </label>
                </div>
              </div>
            )}

            <TableContainer>
              <DataTable
                columns={[
                  {
                    id: 'status',
                    header: 'Status',
                    cell: (row) => statusBadge(String(row.display.status)),
                  },
                  {
                    id: 'line',
                    header: 'Linha',
                    cell: (row) => row.rowNumber,
                  },
                  {
                    id: 'name',
                    header: 'Nome da Rota',
                    cell: (row) => String(row.display.routeName ?? '—'),
                  },
                  {
                    id: 'origin',
                    header: 'Origem',
                    cell: (row) => String(row.display.origin ?? '—'),
                  },
                  {
                    id: 'destination',
                    header: 'Destino',
                    cell: (row) => String(row.display.destination ?? '—'),
                  },
                  {
                    id: 'customer',
                    header: 'Cliente',
                    cell: (row) => String(row.display.customer ?? '—'),
                  },
                  {
                    id: 'branch',
                    header: 'Filial',
                    cell: (row) => String(row.display.branch ?? '—'),
                  },
                  {
                    id: 'lead',
                    header: 'Lead Time (dias)',
                    cell: (row) => String(row.display.leadTimeDays ?? '—'),
                  },
                  {
                    id: 'distance',
                    header: 'Distância',
                    cell: (row) => String(row.display.distanceKm ?? '—'),
                  },
                  {
                    id: 'issue',
                    header: 'Validação',
                    cell: (row) => (
                      <span className="text-xs text-muted-foreground">
                        {String(row.display.issue || '—')}
                      </span>
                    ),
                  },
                ]}
                data={preview.rows}
                getRowKey={(row) => String(row.rowNumber)}
                emptyTitle="Nenhuma linha"
                emptyDescription="A planilha não possui dados."
              />
            </TableContainer>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('upload');
                  setPreview(null);
                }}
                disabled={loading}
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={loading || preview.validCount + preview.warningCount === 0}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Importar registros válidos
              </Button>
            </div>
          </>
        )}

        {step === 'done' && summary && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Importação concluída: {summary.created} criados, {summary.updated}{' '}
                atualizados, {summary.skipped} ignorados
                {summary.failed > 0 ? `, ${summary.failed} falhas` : ''}.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button type="button" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </div>
  );
}

export {RouteImportModal};
