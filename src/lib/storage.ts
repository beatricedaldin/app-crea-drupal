import { Project } from './types';

const STORAGE_KEY = 'drupal-architect-projects';

type RawEntity = Record<string, unknown>;
type RawField = Record<string, unknown>;

function addFieldPrefixes(
  entities: RawEntity[],
  skipFieldName?: string,
): void {
  entities.forEach((entity) => {
    const mn = (entity.machineName as string | undefined)?.replace(/-/g, '_');
    if (!mn) return;
    const prefix = `${mn}_`;
    const fields = (entity.fields as RawField[] | undefined) ?? [];
    fields.forEach((field) => {
      const name = field.machineName as string | undefined;
      if (!name) return;
      if (skipFieldName && name === skipFieldName) return;
      if (!name.startsWith(prefix)) {
        field.machineName = `${prefix}${name}`;
      }
    });
  });
}

function migrate(p: Record<string, unknown>): Project {
  // vocabularies → taxonomies
  if (!p.taxonomies && p.vocabularies) {
    p.taxonomies = (p.vocabularies as RawEntity[]).map((v) => ({
      ...v,
      terms: (v.terms as unknown[]) ?? [],
    }));
    delete p.vocabularies;
  }
  if (!p.taxonomies) p.taxonomies = [];
  (p.taxonomies as RawEntity[]).forEach((t) => {
    if (!t.terms) t.terms = [];
  });
  if (!p.customFieldTypes) p.customFieldTypes = [];
  if (!p.loaderTypes) p.loaderTypes = [];

  // prefisso machine name sui field
  addFieldPrefixes(p.contentTypes as RawEntity[] ?? [], 'title');
  addFieldPrefixes(p.paragraphTypes as RawEntity[] ?? []);
  addFieldPrefixes(p.customFieldTypes as RawEntity[] ?? []);
  addFieldPrefixes(p.loaderTypes as RawEntity[] ?? []);

  return p as unknown as Project;
}

export function loadProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return (JSON.parse(data) as Record<string, unknown>[]).map(migrate);
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function deleteProject(id: string): void {
  const projects = loadProjects().filter(p => p.id !== id);
  saveProjects(projects);
}
