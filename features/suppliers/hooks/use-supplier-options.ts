import * as React from 'react';

import type {SupplierSelectOption} from '../types';

/**
 * Combina opções do servidor com fornecedores criados no modal rápido,
 * sem sincronizar via useEffect (evita react-hooks/set-state-in-effect).
 */
export function useSupplierOptions(initialOptions: SupplierSelectOption[]) {
  const [extraOptions, setExtraOptions] = React.useState<SupplierSelectOption[]>([]);

  const options = React.useMemo(() => {
    const map = new Map(initialOptions.map((item) => [item.id, item]));
    for (const item of extraOptions) {
      map.set(item.id, item);
    }
    return [...map.values()];
  }, [initialOptions, extraOptions]);

  const handleOptionsChange = React.useCallback(
    (next: SupplierSelectOption[]) => {
      const known = new Set(initialOptions.map((item) => item.id));
      setExtraOptions(next.filter((item) => !known.has(item.id)));
    },
    [initialOptions],
  );

  return {options, onOptionsChange: handleOptionsChange};
}
