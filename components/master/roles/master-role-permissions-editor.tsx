'use client';

import * as React from 'react';
import {useRouter} from 'next/navigation';
import {useTransition} from 'react';

import {Button} from '@/components/ui/button';
import {updateMasterRolePermissionsAction} from '@/features/master/roles';
import type {MasterPermissionOption} from '@/features/master/roles';

interface MasterRolePermissionsEditorProps {
  roleName: string;
  permissions: MasterPermissionOption[];
  initialSelectedCodes: string[];
}

export function MasterRolePermissionsEditor({
  roleName,
  permissions,
  initialSelectedCodes,
}: MasterRolePermissionsEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = React.useState(
    () => new Set(initialSelectedCodes),
  );
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const grouped = React.useMemo(() => {
    const map = new Map<string, MasterPermissionOption[]>();
    for (const permission of permissions) {
      const list = map.get(permission.resource) ?? [];
      list.push(permission);
      map.set(permission.resource, list);
    }
    return [...map.entries()];
  }, [permissions]);

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleSave() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateMasterRolePermissionsAction({
        roleName,
        permissionCodes: [...selected],
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage(
        `Permissões atualizadas em ${result.data.updatedRoles} empresa(s).`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {message}
        </p>
      ) : null}

      <div className="space-y-5">
        {grouped.map(([resource, items]) => (
          <section key={resource} className="rounded-xl border border-border p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {resource}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {items.map((permission) => {
                const checked = selected.has(permission.code);
                return (
                  <li key={permission.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        disabled={pending}
                        onChange={() => toggle(permission.code)}
                      />
                      <span>
                        <span className="block text-sm font-medium">
                          {permission.code}
                        </span>
                        {permission.description ? (
                          <span className="block text-xs text-muted-foreground">
                            {permission.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => setSelected(new Set(initialSelectedCodes))}
        >
          Desfazer
        </Button>
        <Button type="button" loading={pending} onClick={handleSave}>
          Salvar matriz
        </Button>
      </div>
    </div>
  );
}
