'use client';

import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import * as XLSX from 'xlsx';
import { Project, ContentType, Taxonomy, ParagraphType } from '@/lib/types';
import { toMachineName } from '@/lib/utils-drupal';
import { getFieldTypeInfo } from '@/lib/drupal-fields';
import { EntityType, ProjectTab } from '@/app/page';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ChevronLeft, Plus, Trash2, Pencil, Layers, BookOpen, PanelsTopLeft, Database, Download, FileJson } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  project: Project;
  tab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
  onChange: (project: Project) => void;
  onBack: () => void;
  onOpenEntity: (type: EntityType, id: string) => void;
}

type DialogState =
  | { mode: 'closed' }
  | { mode: 'create'; entityType: EntityType }
  | { mode: 'edit'; entityType: EntityType; id: string };

const emptyForm = { label: '', machineName: '', description: '', hierarchical: false };

export default function ProjectView({ project, tab, onTabChange, onChange, onBack, onOpenEntity }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' });
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<{ type: EntityType; id: string; label: string } | null>(null);

  const now = () => new Date().toISOString();

  const openCreate = (entityType: EntityType) => {
    setForm(emptyForm);
    setDialog({ mode: 'create', entityType });
  };

  const openEdit = (entityType: EntityType, id: string) => {
    const entity = getEntity(entityType, id);
    if (!entity) return;
    setForm({
      label: entity.label,
      machineName: entity.machineName,
      description: entity.description ?? '',
      hierarchical: 'hierarchical' in entity ? (entity.hierarchical as boolean) : false,
    });
    setDialog({ mode: 'edit', entityType, id });
  };

  const getEntity = (type: EntityType, id: string) => getList(type).find((e) => e.id === id);

  const getList = (type: EntityType) => {
    switch (type) {
      case 'contentType': return project.contentTypes;
      case 'taxonomy': return project.taxonomies;
      case 'paragraph': return project.paragraphTypes;
    }
  };

  const save = () => {
    if (!form.label.trim()) return;
    const t = now();
    const machine = form.machineName.trim() || toMachineName(form.label);

    if (dialog.mode === 'create') {
      const defaultContentTypeFields: import('@/lib/types').Field[] = [
        { id: uuid(), label: 'Title', machineName: 'title', type: 'plain_text_long', required: true, multiple: false },
        { id: uuid(), label: 'Body', machineName: `${machine}_body`, type: 'formatted_text_with_summary', required: false, multiple: false },
      ];
      const base = { id: uuid(), label: form.label.trim(), machineName: machine, description: form.description.trim() || undefined, fields: [] };
      const updated = { ...project, updatedAt: t } as Project;
      switch (dialog.entityType) {
        case 'contentType':
          updated.contentTypes = [...project.contentTypes, { ...base, fields: defaultContentTypeFields, createdAt: t, updatedAt: t } as ContentType];
          break;
        case 'taxonomy':
          updated.taxonomies = [...project.taxonomies, { ...base, hierarchical: form.hierarchical, terms: [] } as Taxonomy];
          break;
        case 'paragraph':
          updated.paragraphTypes = [...project.paragraphTypes, base as ParagraphType];
          break;
      }
      onChange(updated);
    } else if (dialog.mode === 'edit') {
      const updater = (item: { id: string; label: string; machineName: string; description?: string }) =>
        item.id === dialog.id
          ? { ...item, label: form.label.trim(), machineName: machine, description: form.description.trim() || undefined }
          : item;
      const updated = { ...project, updatedAt: t } as Project;
      switch (dialog.entityType) {
        case 'contentType': updated.contentTypes = project.contentTypes.map(updater) as ContentType[]; break;
        case 'taxonomy': updated.taxonomies = project.taxonomies.map((v) => v.id === dialog.id ? { ...v, ...updater(v), hierarchical: form.hierarchical } : v); break;
        case 'paragraph': updated.paragraphTypes = project.paragraphTypes.map(updater) as ParagraphType[]; break;
      }
      onChange(updated);
    }
    setDialog({ mode: 'closed' });
  };

  const deleteEntity = (type: EntityType, id: string) => {
    const updated = { ...project, updatedAt: now() } as Project;
    switch (type) {
      case 'contentType': updated.contentTypes = project.contentTypes.filter((e) => e.id !== id); break;
      case 'taxonomy': updated.taxonomies = project.taxonomies.filter((e) => e.id !== id); break;
      case 'paragraph': updated.paragraphTypes = project.paragraphTypes.filter((e) => e.id !== id); break;
    }
    onChange(updated);
  };

  const entityTypeLabel: Record<EntityType, string> = {
    contentType: 'Content Type',
    taxonomy: 'Taxonomy',
    paragraph: 'Paragraph Type',
  };

  // ── Export ────────────────────────────────────────────────────────────────

  type F = import('@/lib/types').Field;
  type EntityWithFields = { label: string; machineName: string; fields: F[] };

  const toFieldRows = (fields: F[]) =>
    fields.map((f) => ({
      'Label': f.label,
      'Machine name': f.machineName,
      'Tipo': getFieldTypeInfo(f.type)?.label ?? f.type,
      'Categoria': getFieldTypeInfo(f.type)?.category ?? '',
      'Obbligatorio': f.required ? 'Sì' : 'No',
      'Multiplo': f.multiple ? 'Sì' : 'No',
      'Modulo': getFieldTypeInfo(f.type)?.drupalModule ?? '',
      'Target type': f.targetType ?? '',
      'Target bundles': (f.targetBundles ?? []).join(', '),
      'Taxonomy vocab': f.taxonomyVocabulary ?? '',
      'Valori': (f.allowedValues ?? []).map((v) => `${v.key}:${v.label}`).join(' | '),
      'Descrizione': f.description ?? '',
    }));

  const toFieldRowsWithEntity = (entities: EntityWithFields[]) =>
    entities.flatMap((entity) =>
      entity.fields.map((f) => ({
        'Taxonomy': entity.label,
        'Taxonomy machine name': entity.machineName,
        ...toFieldRows([f])[0],
      }))
    );

  const addSheet = (wb: XLSX.WorkBook, name: string, rows: object[]) => {
    const ws = rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([['Nessun elemento']]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  };

  const exportProjectJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportProjectExcel = () => {
    const wb = XLSX.utils.book_new();
    // Un foglio per ogni Content Type
    project.contentTypes.forEach((ct) => addSheet(wb, ct.label, toFieldRows(ct.fields)));
    // Un foglio unico per tutti i campi delle Taxonomy
    addSheet(wb, 'Taxonomy Fields', toFieldRowsWithEntity(project.taxonomies));
    // Un foglio unico per tutti i termini delle Taxonomy
    const termRows = project.taxonomies.flatMap((tx) =>
      (tx.terms ?? []).map((t) => ({
        'Taxonomy': tx.label,
        'Taxonomy machine name': tx.machineName,
        'Termine': t.name,
        'Genitore': tx.terms.find((p) => p.id === t.parentId)?.name ?? '',
      }))
    );
    addSheet(wb, 'Taxonomy Terms', termRows);
    // Un foglio per ogni Paragraph Type
    project.paragraphTypes.forEach((pt) => addSheet(wb, pt.label, toFieldRows(pt.fields)));
    XLSX.writeFile(wb, `${project.name.replace(/\s+/g, '_')}.xlsx`);
  };

  // ── EntityTable ───────────────────────────────────────────────────────────

  const dialogEntityType = dialog.mode !== 'closed' ? dialog.entityType : 'contentType';

  const EntityTable = ({ type, items }: { type: EntityType; items: Array<{ id: string; label: string; machineName: string; description?: string; fields: unknown[] }> }) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{items.length} {items.length === 1 ? 'elemento' : 'elementi'}</span>
        <Button size="sm" onClick={() => openCreate(type)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Aggiungi
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-sm">Nessun {entityTypeLabel[type]} ancora.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Machine name</TableHead>
                <TableHead className="text-center">Campi</TableHead>
                <TableHead className="w-25" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onOpenEntity(type, item.id)}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.machineName}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{(item.fields as unknown[]).length}</Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(type, item.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete({ type, id: item.id, label: item.label })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b px-6 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1">
          <Database className="h-4 w-4" />
          <span className="cursor-pointer hover:text-foreground" onClick={onBack}>Progetti</span>
          <span>/</span>
          <span className="text-foreground font-medium">{project.name}</span>
          {project.clientName && <span className="text-muted-foreground">— {project.clientName}</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportProjectJson}>
            <FileJson className="h-4 w-4 mr-1.5" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={exportProjectExcel}>
            <Download className="h-4 w-4 mr-1.5" />
            Excel
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as ProjectTab)}>
          <TabsList className="mb-6">
            <TabsTrigger value="contentTypes" className="flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              Content Types
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{project.contentTypes.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="taxonomies" className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              Taxonomies
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{project.taxonomies.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="paragraphs" className="flex items-center gap-1.5">
              <PanelsTopLeft className="h-4 w-4" />
              Paragraph Types
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{project.paragraphTypes.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contentTypes">
            <EntityTable type="contentType" items={project.contentTypes} />
          </TabsContent>
          <TabsContent value="taxonomies">
            <EntityTable type="taxonomy" items={project.taxonomies} />
          </TabsContent>
          <TabsContent value="paragraphs">
            <EntityTable type="paragraph" items={project.paragraphTypes} />
          </TabsContent>
        </Tabs>
      </main>

      <ConfirmDialog
        open={confirmDelete !== null}
        title={`Eliminare "${confirmDelete?.label}"?`}
        description="Tutti i campi associati verranno eliminati. L'operazione è irreversibile."
        onConfirm={() => { if (confirmDelete) deleteEntity(confirmDelete.type, confirmDelete.id); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      <Dialog open={dialog.mode !== 'closed'} onOpenChange={(o) => !o && setDialog({ mode: 'closed' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === 'create' ? 'Nuova' : 'Modifica'} {dialog.mode !== 'closed' && entityTypeLabel[dialogEntityType]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-label">Label *</Label>
              <Input
                id="e-label"
                value={form.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setForm((f) => ({ ...f, label, machineName: dialog.mode === 'create' ? toMachineName(label) : f.machineName }));
                }}
                placeholder="es. Categorie articoli"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-machine">Machine name</Label>
              <Input
                id="e-machine"
                value={form.machineName}
                onChange={(e) => setForm((f) => ({ ...f, machineName: e.target.value }))}
                placeholder="es. categorie_articoli"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-desc">Descrizione</Label>
              <Textarea
                id="e-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            {dialogEntityType === 'taxonomy' && (
              <div className="flex items-center gap-3">
                <Switch
                  id="e-hierarchical"
                  checked={form.hierarchical}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, hierarchical: v }))}
                />
                <Label htmlFor="e-hierarchical">Tassonomia gerarchica</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ mode: 'closed' })}>Annulla</Button>
            <Button onClick={save} disabled={!form.label.trim()}>
              {dialog.mode === 'create' ? 'Crea' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
