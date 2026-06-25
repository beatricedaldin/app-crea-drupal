import { Project } from './types';

const STORAGE_KEY = 'drupal-architect-projects';

function migrate(p: Record<string, unknown>): Project {
  // vocabularies → taxonomies (aggiunge terms: [] se mancanti)
  if (!p.taxonomies && p.vocabularies) {
    p.taxonomies = (p.vocabularies as Record<string, unknown>[]).map((v) => ({
      ...v,
      terms: (v.terms as unknown[]) ?? [],
    }));
    delete p.vocabularies;
  }
  if (!p.taxonomies) p.taxonomies = [];
  // assicura terms su ogni taxonomy
  (p.taxonomies as Record<string, unknown>[]).forEach((t) => {
    if (!t.terms) t.terms = [];
  });
  if (!p.customFieldTypes) p.customFieldTypes = [];
  if (!p.loaderTypes) p.loaderTypes = [];
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
