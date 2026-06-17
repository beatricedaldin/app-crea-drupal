/** Converts a human label to a Drupal-style machine name (lowercase, underscores, no accents). */
export function toMachineName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([0-9])/, '_$1');
}

/** Converts a label to a field machine name (adds field_ prefix). */
export function toFieldMachineName(label: string): string {
  const base = toMachineName(label);
  if (!base) return 'field_';
  if (base.startsWith('field_')) return base;
  return `field_${base}`;
}

/** Formats an ISO date string to Italian locale. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
