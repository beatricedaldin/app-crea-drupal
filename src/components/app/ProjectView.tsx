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
import { ChevronLeft, Plus, Trash2, Pencil, Layers, BookOpen, PanelsTopLeft, Database, Download, FileJson, LayoutTemplate, Package, Blocks, FolderInput } from 'lucide-react';
import { PARAGRAPH_PRESETS, ParagraphPreset } from '@/lib/paragraph-presets';
import { CUSTOM_FIELD_PRESETS, CustomFieldPreset } from '@/lib/custom-field-presets';
import { CONTENT_TYPE_PRESETS, ContentTypePreset } from '@/lib/content-type-presets';
import { downloadTaxonomyModule } from '@/lib/taxonomy-module-generator';
import { downloadAllCustomFieldsModule, downloadAllParagraphsModule, downloadAllContentTypesModule, downloadAllLoadersModule } from '@/lib/paragraph-module-generator';
import ConfirmDialog from './ConfirmDialog';
import ThemeToggle from './ThemeToggle';

interface EntityTableProps {
  type: EntityType;
  items: Array<{ id: string; label: string; machineName: string; description?: string; fields: unknown[] }>;
  emptyLabel: string;
  onAdd: () => void;
  onOpenEntity: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, label: string) => void;
  onFromTemplate?: () => void;
  onDownloadModule?: () => void;
}

function EntityTable({ items, emptyLabel, onAdd, onOpenEntity, onEdit, onDelete, onFromTemplate, onDownloadModule }: EntityTableProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{items.length} {items.length === 1 ? 'elemento' : 'elementi'}</span>
        <div className="flex gap-2">
          {onDownloadModule && (
            <Button size="sm" variant="outline" onClick={onDownloadModule}>
              <Package className="h-4 w-4 mr-1.5" />
              Download modulo
            </Button>
          )}
          {onFromTemplate && (
            <Button size="sm" variant="outline" onClick={onFromTemplate}>
              <LayoutTemplate className="h-4 w-4 mr-1.5" />
              Template
            </Button>
          )}
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            Aggiungi
          </Button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-sm">Nessun {emptyLabel}</p>
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
                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onOpenEntity(item.id)}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.machineName}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{item.fields.length}</Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item.id, item.label)}>
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
}

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
  const [contentTypeTemplatePicker, setContentTypeTemplatePicker] = useState(false);
  const [paragraphTemplatePicker, setParagraphTemplatePicker] = useState(false);
  const [customFieldTemplatePicker, setCustomFieldTemplatePicker] = useState(false);

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
      case 'customField': return project.customFieldTypes;
      case 'loader': return project.loaderTypes;
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
        case 'customField':
          updated.customFieldTypes = [...project.customFieldTypes, base as ParagraphType];
          break;
        case 'loader':
          updated.loaderTypes = [...project.loaderTypes, base as ParagraphType];
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
        case 'customField': updated.customFieldTypes = project.customFieldTypes.map(updater) as ParagraphType[]; break;
        case 'loader': updated.loaderTypes = project.loaderTypes.map(updater) as ParagraphType[]; break;
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
      case 'customField': updated.customFieldTypes = project.customFieldTypes.filter((e) => e.id !== id); break;
      case 'loader': updated.loaderTypes = project.loaderTypes.filter((e) => e.id !== id); break;
    }
    onChange(updated);
  };

  const createContentTypeFromTemplate = (preset: ContentTypePreset) => {
    const t = now();
    onChange({
      ...project,
      updatedAt: t,
      contentTypes: [
        ...project.contentTypes,
        {
          id: uuid(),
          label: preset.label,
          machineName: preset.machineName,
          description: preset.description,
          fields: preset.fields.map((f) => ({ ...f, id: uuid() })),
          createdAt: t,
          updatedAt: t,
        } as ContentType,
      ],
    });
    setContentTypeTemplatePicker(false);
  };

  const createParagraphFromTemplate = (preset: ParagraphPreset) => {
    const t = now();
    onChange({
      ...project,
      updatedAt: t,
      paragraphTypes: [
        ...project.paragraphTypes,
        {
          id: uuid(),
          label: preset.label,
          machineName: preset.machineName,
          description: preset.description,
          fields: preset.fields.map((f) => ({ ...f, id: uuid(), machineName: `${preset.machineName}_${f.machineName}` })),
        },
      ],
    });
    setParagraphTemplatePicker(false);
  };

  const createCustomFieldFromTemplate = (preset: CustomFieldPreset) => {
    const t = now();
    onChange({
      ...project,
      updatedAt: t,
      customFieldTypes: [
        ...project.customFieldTypes,
        {
          id: uuid(),
          label: preset.label,
          machineName: preset.machineName,
          description: preset.description,
          fields: preset.fields.map((f) => ({ ...f, id: uuid(), machineName: `${preset.machineName}_${f.machineName}` })),
        },
      ],
    });
    setCustomFieldTemplatePicker(false);
  };

  const entityTypeLabel: Record<EntityType, string> = {
    contentType: 'Content Type',
    taxonomy: 'Taxonomy',
    paragraph: 'Paragraph Type',
    customField: 'Custom Field',
    loader: 'Loader',
  };

  // ── Export ────────────────────────────────────────────────────────────────

  type F = import('@/lib/types').Field;

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

    // Un foglio unico per le Taxonomy: ogni taxonomy ha una tabella campi e una tabella termini
    const fieldHeaders = ['Label', 'Machine name', 'Tipo', 'Categoria', 'Obbligatorio', 'Multiplo', 'Modulo', 'Target type', 'Target bundles', 'Taxonomy vocab', 'Valori', 'Descrizione'];
    const termHeaders = ['Termine', 'Genitore'];
    const taxAoa: unknown[][] = [];

    project.taxonomies.forEach((tx, idx) => {
      if (idx > 0) { taxAoa.push([]); taxAoa.push([]); }

      taxAoa.push([`Taxonomy: ${tx.label} (${tx.machineName})${tx.hierarchical ? ' — Gerarchica' : ''}`]);

      taxAoa.push([]);
      taxAoa.push(['Campi']);
      taxAoa.push(fieldHeaders);
      if (tx.fields.length === 0) {
        taxAoa.push(['Nessun campo']);
      } else {
        toFieldRows(tx.fields).forEach((row) => {
          taxAoa.push(fieldHeaders.map((h) => (row as Record<string, unknown>)[h] ?? ''));
        });
      }

      taxAoa.push([]);
      taxAoa.push(['Termini']);
      taxAoa.push(termHeaders);
      const terms = tx.terms ?? [];
      if (terms.length === 0) {
        taxAoa.push(['Nessun termine']);
      } else {
        terms.forEach((t) => {
          taxAoa.push([t.name, terms.find((p) => p.id === t.parentId)?.name ?? '']);
        });
      }
    });

    if (taxAoa.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(taxAoa), 'Taxonomies');
    } else {
      addSheet(wb, 'Taxonomies', []);
    }

    // Un foglio per ogni Paragraph Type
    project.paragraphTypes.forEach((pt) => addSheet(wb, pt.label, toFieldRows(pt.fields)));

    // Un foglio per ogni Custom Field
    project.customFieldTypes.forEach((cf) => addSheet(wb, `[CF] ${cf.label}`, toFieldRows(cf.fields)));

    // Un foglio per ogni Loader
    project.loaderTypes.forEach((l) => addSheet(wb, `[L] ${l.label}`, toFieldRows(l.fields)));

    XLSX.writeFile(wb, `${project.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const dialogEntityType = dialog.mode !== 'closed' ? dialog.entityType : 'contentType';

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
          <ThemeToggle />
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
              Paragraphs
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{project.paragraphTypes.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="customFields" className="flex items-center gap-1.5">
              <Blocks className="h-4 w-4" />
              Custom Fields
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{project.customFieldTypes.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="loaders" className="flex items-center gap-1.5">
              <FolderInput className="h-4 w-4" />
              Loaders
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{project.loaderTypes.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contentTypes">
            <EntityTable
              type="contentType" items={project.contentTypes} emptyLabel={entityTypeLabel.contentType}
              onAdd={() => openCreate('contentType')}
              onOpenEntity={(id) => onOpenEntity('contentType', id)}
              onEdit={(id) => openEdit('contentType', id)}
              onDelete={(id, label) => setConfirmDelete({ type: 'contentType', id, label })}
              onFromTemplate={() => setContentTypeTemplatePicker(true)}
              onDownloadModule={() => downloadAllContentTypesModule(project.contentTypes)}
            />
          </TabsContent>
          <TabsContent value="taxonomies">
            <EntityTable
              type="taxonomy" items={project.taxonomies} emptyLabel={entityTypeLabel.taxonomy}
              onAdd={() => openCreate('taxonomy')}
              onOpenEntity={(id) => onOpenEntity('taxonomy', id)}
              onEdit={(id) => openEdit('taxonomy', id)}
              onDelete={(id, label) => setConfirmDelete({ type: 'taxonomy', id, label })}
              onDownloadModule={() => downloadTaxonomyModule(project)}
            />
          </TabsContent>
          <TabsContent value="paragraphs">
            <EntityTable
              type="paragraph" items={project.paragraphTypes} emptyLabel={entityTypeLabel.paragraph}
              onAdd={() => openCreate('paragraph')}
              onOpenEntity={(id) => onOpenEntity('paragraph', id)}
              onEdit={(id) => openEdit('paragraph', id)}
              onDelete={(id, label) => setConfirmDelete({ type: 'paragraph', id, label })}
              onFromTemplate={() => setParagraphTemplatePicker(true)}
              onDownloadModule={() => downloadAllParagraphsModule(project.paragraphTypes)}
            />
          </TabsContent>
          <TabsContent value="customFields">
            <EntityTable
              type="customField" items={project.customFieldTypes} emptyLabel={entityTypeLabel.customField}
              onAdd={() => openCreate('customField')}
              onOpenEntity={(id) => onOpenEntity('customField', id)}
              onEdit={(id) => openEdit('customField', id)}
              onDelete={(id, label) => setConfirmDelete({ type: 'customField', id, label })}
              onFromTemplate={() => setCustomFieldTemplatePicker(true)}
              onDownloadModule={() => downloadAllCustomFieldsModule(project.customFieldTypes)}
            />
          </TabsContent>
          <TabsContent value="loaders">
            <EntityTable
              type="loader" items={project.loaderTypes} emptyLabel={entityTypeLabel.loader}
              onAdd={() => openCreate('loader')}
              onOpenEntity={(id) => onOpenEntity('loader', id)}
              onEdit={(id) => openEdit('loader', id)}
              onDelete={(id, label) => setConfirmDelete({ type: 'loader', id, label })}
              onDownloadModule={() => downloadAllLoadersModule(project.loaderTypes)}
            />
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

      <Dialog open={contentTypeTemplatePicker} onOpenChange={setContentTypeTemplatePicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Scegli un template Content Type</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {CONTENT_TYPE_PRESETS.map((preset) => (
              <button
                key={preset.machineName}
                className="text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => createContentTypeFromTemplate(preset)}
              >
                <div className="font-medium">{preset.label}</div>
                {preset.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{preset.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {preset.fields.map((f) => (
                    <Badge key={f.machineName} variant="secondary" className="text-xs font-mono">
                      {f.label}
                    </Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paragraphTemplatePicker} onOpenChange={setParagraphTemplatePicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Scegli un template Paragraph</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {PARAGRAPH_PRESETS.map((preset) => (
              <button
                key={preset.machineName}
                className="text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => createParagraphFromTemplate(preset)}
              >
                <div className="font-medium">{preset.label}</div>
                {preset.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{preset.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {preset.fields.map((f) => (
                    <Badge key={f.machineName} variant="secondary" className="text-xs font-mono">
                      {f.label}
                    </Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={customFieldTemplatePicker} onOpenChange={setCustomFieldTemplatePicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Scegli un template Custom Field</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {CUSTOM_FIELD_PRESETS.map((preset) => (
              <button
                key={preset.machineName}
                className="text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => createCustomFieldFromTemplate(preset)}
              >
                <div className="font-medium">{preset.label}</div>
                {preset.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{preset.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {preset.fields.map((f) => (
                    <Badge key={f.machineName} variant="secondary" className="text-xs font-mono">
                      {f.label}
                    </Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
