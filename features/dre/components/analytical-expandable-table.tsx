'use client';

import {ChevronDown, ChevronRight} from 'lucide-react';
import * as React from 'react';

import {EmptyState} from '@/components/common/empty-state';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';

export interface AnalyticalExpandableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface AnalyticalExpandableTableProps<TGroup, TDetail> {
  /** Quando vazio, o título externo (ex.: com filtros) controla o cabeçalho. */
  title?: string;
  groups: TGroup[];
  getGroupKey: (group: TGroup) => string;
  groupColumns: AnalyticalExpandableColumn<TGroup>[];
  detailColumns: AnalyticalExpandableColumn<TDetail>[];
  getDetailKey: (detail: TDetail) => string;
  /**
   * Carrega detalhes sob demanda ao expandir.
   * Retorna as linhas de detalhe (ex.: viagens da rota).
   */
  loadDetails: (group: TGroup) => Promise<TDetail[]>;
  /**
   * Terceiro nível opcional (ex.: breakdown financeiro da viagem).
   * Não altera o contrato de grupos — apenas renderiza painel sob a linha.
   */
  renderDetailExpansion?: (detail: TDetail) => React.ReactNode;
  /** Chave de persistência do estado de expansão (sessionStorage). */
  expansionStorageKey?: string;
  /** Persistência das linhas de detalhe expandidas (nível 3). */
  detailExpansionStorageKey?: string;
  /**
   * Quando muda (ex.: filtros), limpa o cache de detalhes e
   * recarrega as linhas ainda expandidas.
   */
  dataRevision?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  detailEmptyTitle?: string;
  className?: string;
}

function readStoredKeys(storageKey: string | undefined): Set<string> {
  if (!storageKey || typeof window === 'undefined') return new Set();
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

function writeStoredKeys(storageKey: string | undefined, keys: Set<string>) {
  if (!storageKey || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(Array.from(keys)));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Tabela analítica expansível genérica.
 * A dimensão agrupadora (rota, cliente, veículo, …) é só parâmetro de dados —
 * o layout e o lazy load de detalhes permanecem os mesmos.
 */
function AnalyticalExpandableTable<TGroup, TDetail>({
  title,
  groups,
  getGroupKey,
  groupColumns,
  detailColumns,
  getDetailKey,
  loadDetails,
  renderDetailExpansion,
  expansionStorageKey,
  detailExpansionStorageKey,
  dataRevision,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription = 'Não há dados para exibir no momento.',
  detailEmptyTitle = 'Sem detalhes',
  className,
}: AnalyticalExpandableTableProps<TGroup, TDetail>) {
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [expandedDetailKeys, setExpandedDetailKeys] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [detailsByKey, setDetailsByKey] = React.useState<
    Record<string, TDetail[]>
  >({});
  const [loadingKeys, setLoadingKeys] = React.useState<Set<string>>(new Set());
  const [errorByKey, setErrorByKey] = React.useState<Record<string, string>>({});
  const hydratedRef = React.useRef(false);
  const detailHydratedRef = React.useRef(false);
  const loadDetailsRef = React.useRef(loadDetails);
  loadDetailsRef.current = loadDetails;

  React.useEffect(() => {
    const stored = readStoredKeys(expansionStorageKey);
    hydratedRef.current = true;
    if (stored.size === 0) return;
    setExpandedKeys(stored);
  }, [expansionStorageKey]);

  React.useEffect(() => {
    const stored = readStoredKeys(detailExpansionStorageKey);
    detailHydratedRef.current = true;
    if (stored.size === 0) return;
    setExpandedDetailKeys(stored);
  }, [detailExpansionStorageKey]);

  React.useEffect(() => {
    if (!hydratedRef.current) return;
    writeStoredKeys(expansionStorageKey, expandedKeys);
  }, [expandedKeys, expansionStorageKey]);

  React.useEffect(() => {
    if (!detailHydratedRef.current) return;
    writeStoredKeys(detailExpansionStorageKey, expandedDetailKeys);
  }, [expandedDetailKeys, detailExpansionStorageKey]);

  // Invalida cache de detalhes quando filtros/dados mudam.
  React.useEffect(() => {
    setDetailsByKey({});
    setErrorByKey({});
    setLoadingKeys(new Set());
  }, [dataRevision]);

  const groupKeySet = React.useMemo(
    () => new Set(groups.map(getGroupKey)),
    [groups, getGroupKey],
  );

  // Mantém expansão após troca de filtros quando a chave ainda existe.
  React.useEffect(() => {
    setExpandedKeys((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const key of prev) {
        if (groupKeySet.has(key)) {
          next.add(key);
        } else {
          changed = true;
        }
      }
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [groupKeySet]);

  const detailKeySet = React.useMemo(() => {
    const keys = new Set<string>();
    for (const list of Object.values(detailsByKey)) {
      for (const detail of list) {
        keys.add(getDetailKey(detail));
      }
    }
    return keys;
  }, [detailsByKey, getDetailKey]);

  React.useEffect(() => {
    setExpandedDetailKeys((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const key of prev) {
        if (detailKeySet.has(key)) {
          next.add(key);
        } else if (detailKeySet.size > 0) {
          changed = true;
        } else {
          next.add(key);
        }
      }
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [detailKeySet]);

  const loadGroupDetails = React.useCallback(async (group: TGroup) => {
    const key = getGroupKey(group);

    setLoadingKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setErrorByKey((prev) => {
      if (!(key in prev)) return prev;
      const next = {...prev};
      delete next[key];
      return next;
    });

    try {
      const details = await loadDetailsRef.current(group);
      setDetailsByKey((prev) => ({...prev, [key]: details}));
    } catch (err) {
      setErrorByKey((prev) => ({
        ...prev,
        [key]:
          err instanceof Error ? err.message : 'Erro ao carregar detalhes.',
      }));
    } finally {
      setLoadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [getGroupKey]);

  // Recarrega detalhes das linhas expandidas após revisão de dados.
  React.useEffect(() => {
    for (const group of groups) {
      const key = getGroupKey(group);
      if (!expandedKeys.has(key)) continue;
      if (key in detailsByKey) continue;
      if (loadingKeys.has(key)) continue;
      void loadGroupDetails(group);
    }
  }, [
    groups,
    expandedKeys,
    detailsByKey,
    loadingKeys,
    getGroupKey,
    loadGroupDetails,
    dataRevision,
  ]);

  const toggleGroup = (group: TGroup) => {
    const key = getGroupKey(group);
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        if (!(key in detailsByKey) && !loadingKeys.has(key)) {
          void loadGroupDetails(group);
        }
      }
      return next;
    });
  };

  const toggleDetail = (detail: TDetail) => {
    const key = getDetailKey(detail);
    setExpandedDetailKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const heading = title?.trim() ? (
    <h3 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h3>
  ) : null;

  if (groups.length === 0) {
    return (
      <div className={className}>
        {heading}
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          className="border border-border bg-card"
        />
      </div>
    );
  }

  const hasDetailExpansion = Boolean(renderDetailExpansion);
  const colSpan = groupColumns.length + 1;
  const detailColSpan = detailColumns.length + (hasDetailExpansion ? 1 : 0);

  return (
    <div className={className}>
      {heading}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="h-10 w-10 px-2 text-left align-middle" aria-label="Expandir" />
                {groupColumns.map((column) => (
                  <th
                    key={column.id}
                    className={cn(
                      'h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground',
                      column.headerClassName,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const key = getGroupKey(group);
                const expanded = expandedKeys.has(key);
                const loading = loadingKeys.has(key);
                const details = detailsByKey[key];
                const error = errorByKey[key];

                return (
                  <React.Fragment key={key}>
                    <tr className="border-b border-border transition-colors hover:bg-muted/30">
                      <td className="px-2 py-3 align-middle">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group)}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          aria-expanded={expanded}
                          aria-label={expanded ? 'Recolher' : 'Expandir'}
                        >
                          {expanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                      </td>
                      {groupColumns.map((column) => (
                        <td
                          key={column.id}
                          className={cn('px-4 py-3 align-middle', column.className)}
                        >
                          {column.cell(group)}
                        </td>
                      ))}
                    </tr>
                    {expanded ? (
                      <tr className="border-b border-border bg-muted/20">
                        <td colSpan={colSpan} className="p-0">
                          <div className="px-4 py-3">
                            {loading && !details ? (
                              <div className="space-y-2">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                              </div>
                            ) : null}
                            {error ? (
                              <p className="text-sm text-destructive">{error}</p>
                            ) : null}
                            {details && details.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                {detailEmptyTitle}
                              </p>
                            ) : null}
                            {details && details.length > 0 ? (
                              <div className="overflow-x-auto rounded-lg border border-border bg-background">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                      {hasDetailExpansion ? (
                                        <th
                                          className="h-9 w-10 px-2 text-left align-middle"
                                          aria-label="Expandir viagem"
                                        />
                                      ) : null}
                                      {detailColumns.map((column) => (
                                        <th
                                          key={column.id}
                                          className={cn(
                                            'h-9 px-3 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground',
                                            column.headerClassName,
                                          )}
                                        >
                                          {column.header}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {details.map((detail) => {
                                      const detailKey = getDetailKey(detail);
                                      const detailExpanded =
                                        expandedDetailKeys.has(detailKey);

                                      return (
                                        <React.Fragment key={detailKey}>
                                          <tr className="border-b border-border last:border-0">
                                            {hasDetailExpansion ? (
                                              <td className="px-2 py-2.5 align-middle">
                                                <button
                                                  type="button"
                                                  onClick={() => toggleDetail(detail)}
                                                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                                  aria-expanded={detailExpanded}
                                                  aria-label={
                                                    detailExpanded
                                                      ? 'Recolher financeiro'
                                                      : 'Expandir financeiro'
                                                  }
                                                >
                                                  {detailExpanded ? (
                                                    <ChevronDown className="size-4" />
                                                  ) : (
                                                    <ChevronRight className="size-4" />
                                                  )}
                                                </button>
                                              </td>
                                            ) : null}
                                            {detailColumns.map((column) => (
                                              <td
                                                key={column.id}
                                                className={cn(
                                                  'px-3 py-2.5 align-middle',
                                                  column.className,
                                                )}
                                              >
                                                {column.cell(detail)}
                                              </td>
                                            ))}
                                          </tr>
                                          {hasDetailExpansion && detailExpanded ? (
                                            <tr className="border-b border-border bg-muted/10 last:border-0">
                                              <td
                                                colSpan={detailColSpan}
                                                className="px-3 py-3"
                                              >
                                                {renderDetailExpansion?.(detail)}
                                              </td>
                                            </tr>
                                          ) : null}
                                        </React.Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export {AnalyticalExpandableTable};
