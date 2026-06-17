'use client';

import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Project, ContentType, Vocabulary, ParagraphType, MediaType } from '@/lib/types';
import { toMachineName } from '@/lib/utils-drupal';
import { EntityType, ProjectTab } from '@/app/page';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ChevronLeft, Plus, Trash2, Pencil, Layers, BookOpen, PanelsTopLeft, Film, Database } from 'lucide-react';
import { MEDIA_SOURCE_TYPES } from '@/lib/drupal-fields';

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

const emptyForm = { label: '', machineName: '', description: '', hierarchical: false, sourceType: 'image' as const };

export default function ProjectView({ project, tab, onTabChange, onChange, onBack, onOpenEntity }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' });
  const [form, setForm] = useState(emptyForm);

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
      sourceType: 'sourceType' in entity ? (entity.sourceType as typeof form.sourceType) : 'image',
    });
    setDialog({ mode: 'edit', entityType, id });
  };

  const getEntity = (type: EntityType, id: string) => {
    const list = getList(type);
    return list.find((e) => e.id === id);
  };

  const getList = (type: EntityType) => {
    switch (type) {
      case 'contentType': return project.contentTypes;
      case 'vocabulary': return project.vocabularies;
      case 'paragraph': return project.paragraphTypes;
      case 'media': return project.mediaTypes;
    }
  };

  const save = () => {
    if (!form.label.trim()) return;
    const t = now();
    const machine = form.machineName.trim() || toMachineName(form.label);

    if (dialog.mode === 'create') {
      const base = { id: uuid(), label: form.label.trim(), machineName: machine, description: form.description.trim() || undefined, fields: [] };
      const updated = { ...project, updatedAt: t } as Project;
      switch (dialog.entityType) {
        case 'contentType':
          updated.contentTypes = [...project.contentTypes, { ...base, createdAt: t, updatedAt: t } as ContentType];
          break;
        case 'vocabulary':
          updated.vocabularies = [...project.vocabularies, { ...base, hierarchical: form.hierarchical } as Vocabulary];
          break;
        case 'paragraph':
          updated.paragraphTypes = [...project.paragraphTypes, base as ParagraphType];
          break;
        case 'media':
          updated.mediaTypes = [...project.mediaTypes, { ...base, sourceType: form.sourceType } as MediaType];
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
        case 'vocabulary': updated.vocabularies = project.vocabularies.map((v) => v.id === dialog.id ? { ...v, ...updater(v), hierarchical: form.hierarchical } : v); break;
        case 'paragraph': updated.paragraphTypes = project.paragraphTypes.map(updater) as ParagraphType[]; break;
        case 'media': updated.mediaTypes = project.mediaTypes.map((m) => m.id === dialog.id ? { ...m, ...updater(m), sourceType: form.sourceType } : m); break;
      }
      onChange(updated);
    }
    setDialog({ mode: 'closed' });
  };

  const deleteEntity = (type: EntityType, id: string) => {
    const updated = { ...project, updatedAt: now() } as Project;
    switch (type) {
      case 'contentType': updated.contentTypes = project.contentTypes.filter((e) => e.id !== id); break;
      case 'vocabulary': updated.vocabularies = project.vocabularies.filter((e) => e.id !== id); break;
      case 'paragraph': updated.paragraphTypes = project.paragraphTypes.filter((e) => e.id !== id); break;
      case 'media': updated.mediaTypes = project.mediaTypes.filter((e) => e.id !== id); break;
    }
    onChange(updated);
  };

  const entityTypeLabel: Record<EntityType, string> = {
    contentType: 'Content Type',
    vocabulary: 'Vocabulary',
    paragraph: 'Paragraph Type',
    media: 'Media Type',
  };

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
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onOpenEntity(type, item.id)}
                >
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
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteEntity(type, item.id)}>
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          <span className="cursor-pointer hover:text-foreground" onClick={onBack}>Progetti</span>
          <span>/</span>
          <span className="text-foreground font-medium">{project.name}</span>
          {project.clientName && <span className="text-muted-foreground">— {project.clientName}</span>}
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
            <TabsTrigger value="vocabularies" className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              Vocabularies
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{project.vocabularies.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="paragraphs" className="flex items-center gap-1.5">
              <PanelsTopLeft className="h-4 w-4" />
              Paragraph Types
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{project.paragraphTypes.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-1.5">
              <Film className="h-4 w-4" />
              Media Types
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{project.mediaTypes.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contentTypes">
            <EntityTable type="contentType" items={project.contentTypes} />
          </TabsContent>
          <TabsContent value="vocabularies">
            <EntityTable type="vocabulary" items={project.vocabularies} />
          </TabsContent>
          <TabsContent value="paragraphs">
            <EntityTable type="paragraph" items={project.paragraphTypes} />
          </TabsContent>
          <TabsContent value="media">
            <EntityTable type="media" items={project.mediaTypes} />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={dialog.mode !== 'closed'} onOpenChange={(o) => !o && setDialog({ mode: 'closed' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === 'create' ? 'Nuovo' : 'Modifica'} {dialog.mode !== 'closed' && entityTypeLabel[dialogEntityType]}
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
                placeholder="es. Articolo di Blog"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-machine">Machine name</Label>
              <Input
                id="e-machine"
                value={form.machineName}
                onChange={(e) => setForm((f) => ({ ...f, machineName: e.target.value }))}
                placeholder="es. articolo_blog"
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
            {dialogEntityType === 'vocabulary' && (
              <div className="flex items-center gap-3">
                <Switch
                  id="e-hierarchical"
                  checked={form.hierarchical}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, hierarchical: v }))}
                />
                <Label htmlFor="e-hierarchical">Tassonomia gerarchica</Label>
              </div>
            )}
            {dialogEntityType === 'media' && (
              <div className="space-y-1.5">
                <Label htmlFor="e-source">Sorgente media</Label>
                <Select value={form.sourceType} onValueChange={(v) => setForm((f) => ({ ...f, sourceType: v as typeof form.sourceType }))}>
                  <SelectTrigger id="e-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIA_SOURCE_TYPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
