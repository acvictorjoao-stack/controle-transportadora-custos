export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatTaxId(value: string): string {
  const digits = digitsOnly(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getDisplayName(legalName: string, tradeName: string | null): string {
  return tradeName?.trim() || legalName;
}

export function readNotesFromSettings(settings: Record<string, unknown>): string | null {
  const notes = settings.notes;
  if (typeof notes === 'string' && notes.trim()) {
    return notes.trim();
  }
  return null;
}

export function readPlanSlugFromSettings(
  settings: Record<string, unknown>,
  fallback = 'free',
): string {
  const slug = settings.plan_slug;
  if (typeof slug === 'string' && slug.trim()) {
    return slug.trim();
  }
  return fallback;
}

export function readProvisionHistoryFromSettings(
  settings: Record<string, unknown>,
): Array<{at: string; status: string; message?: string | null}> {
  const history = settings.provision_history;
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map((entry) => ({
      at: String(entry.at ?? ''),
      status: String(entry.status ?? ''),
      message:
        typeof entry.message === 'string'
          ? entry.message
          : entry.message == null
            ? null
            : null,
    }))
    .filter((entry) => entry.at.length > 0);
}
