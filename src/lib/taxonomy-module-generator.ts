import JSZip from 'jszip';
import { Project, Taxonomy, TaxonomyTerm } from './types';

const escapePhp = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

function generateVocabSection(tax: Taxonomy, index: number): string[] {
  const lines: string[] = [];
  const num = String(index + 1).padStart(2, '0');
  const hierarchyNote = tax.hierarchical ? '  (gerarchico)' : '';

  lines.push(`  // -------------------------------------------------------------------------`);
  lines.push(`  // ${num} · ${tax.label}${hierarchyNote}`);
  lines.push(`  // -------------------------------------------------------------------------`);
  lines.push(`  $vocab('${escapePhp(tax.machineName)}', '${escapePhp(tax.label)}');`);

  const terms = tax.terms ?? [];

  if (terms.length === 0) {
    lines.push('');
    return lines;
  }

  if (!tax.hierarchical) {
    const labels = terms.map((t) => `    '${escapePhp(t.name)}'`).join(',\n');
    lines.push(`  foreach ([`);
    lines.push(labels);
    lines.push(`  ] as $label) {`);
    lines.push(`    $term('${escapePhp(tax.machineName)}', $label);`);
    lines.push(`  }`);
  } else {
    const byId = new Map(terms.map((t) => [t.id, t]));
    const childrenMap = new Map<string, TaxonomyTerm[]>();
    const roots: TaxonomyTerm[] = [];

    terms.forEach((t) => {
      if (t.parentId && byId.has(t.parentId)) {
        const list = childrenMap.get(t.parentId) ?? [];
        list.push(t);
        childrenMap.set(t.parentId, list);
      } else {
        roots.push(t);
      }
    });

    let varCounter = 0;
    const vid = escapePhp(tax.machineName);

    const traverse = (term: TaxonomyTerm, parentVar: string | null) => {
      const kids = childrenMap.get(term.id) ?? [];
      const parentArg = parentVar ? `, ${parentVar}` : '';
      if (kids.length > 0) {
        const v = `$t${varCounter++}`;
        lines.push(`  ${v} = $term('${vid}', '${escapePhp(term.name)}'${parentArg});`);
        kids.forEach((child) => traverse(child, v));
      } else {
        lines.push(`  $term('${vid}', '${escapePhp(term.name)}'${parentArg});`);
      }
    };

    roots.forEach((root) => traverse(root, null));
  }

  lines.push('');
  return lines;
}

function generateInfoYml(): string {
  return [
    `name: Dinamo Taxonomies`,
    `type: module`,
    `description: Crea tutti i vocabulary Drupal del progetto.`,
    `package: Dinamo`,
    `core_version_requirement: ^11`,
    '',
  ].join('\n');
}

function generateInstall(taxonomies: Taxonomy[]): string {
  const sections = taxonomies.flatMap((tax, i) => generateVocabSection(tax, i));

  return [
    `<?php`,
    ``,
    `/**`,
    ` * @file`,
    ` * Install, update and uninstall functions for the Dinamo Taxonomies module.`,
    ` */`,
    ``,
    `use Drupal\\taxonomy\\Entity\\Vocabulary;`,
    `use Drupal\\taxonomy\\Entity\\Term;`,
    ``,
    `/**`,
    ` * Implements hook_install().`,
    ` */`,
    `function dinamo_taxonomies_install(): void {`,
    `  _dinamo_taxonomies_create_all();`,
    `}`,
    ``,
    `/**`,
    ` * Implements hook_uninstall().`,
    ` */`,
    `function dinamo_taxonomies_uninstall(): void {`,
    `  // I vocabulary non vengono eliminati per preservare i dati.`,
    `}`,
    ``,
    `/**`,
    ` * Crea tutti i vocabolari e i termini di tassonomia.`,
    ` */`,
    `function _dinamo_taxonomies_create_all(): void {`,
    ``,
    `  // Crea un vocabolario se non esiste già.`,
    `  $vocab = function (string $vid, string $name): void {`,
    `    if (!Vocabulary::load($vid)) {`,
    `      Vocabulary::create(['vid' => $vid, 'name' => $name])->save();`,
    `    }`,
    `  };`,
    ``,
    `  // Crea un termine e restituisce il TID (utile per le gerarchie).`,
    `  $term = function (string $vid, string $name, int $parent = 0): int {`,
    `    $existing = \\Drupal::entityTypeManager()`,
    `      ->getStorage('taxonomy_term')`,
    `      ->loadByProperties(['name' => $name, 'vid' => $vid]);`,
    `    if (!empty($existing)) {`,
    `      return (int) reset($existing)->id();`,
    `    }`,
    `    $t = Term::create([`,
    `      'vid'    => $vid,`,
    `      'name'   => $name,`,
    `      'parent' => [$parent],`,
    `    ]);`,
    `    $t->save();`,
    `    return (int) $t->id();`,
    `  };`,
    ``,
    ...sections,
    `}`,
    ``,
  ].join('\n');
}

export async function downloadTaxonomyModule(project: Project): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('dinamo-taxonomies')!;
  folder.file('dinamo_taxonomies.info.yml', generateInfoYml());
  folder.file('dinamo_taxonomies.install',  generateInstall(project.taxonomies));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dinamo-taxonomies.zip';
  a.click();
  URL.revokeObjectURL(url);
}
