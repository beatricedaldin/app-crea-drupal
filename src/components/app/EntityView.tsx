'use client';

import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Project, Field, ContentType, Taxonomy, TaxonomyTerm, ParagraphType } from '@/lib/types';
import { EntityType } from '@/app/page';
import { CATEGORY_COLORS, getFieldTypeInfo } from '@/lib/drupal-fields';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeft, Plus, Trash2, Pencil, Database, Download,
} from 'lucide-react';
import FieldDialog from './FieldDialog';
import ConfirmDialog from './ConfirmDialog';
import { downloadParagraphModule } from '@/lib/paragraph-module-generator';

interface Props {
  project: Project;
  entityType: EntityType;
  entityId: string;
  onChange: (project: Project) => void;
  onBack: () => void;
}

type AnyEntity = ContentType | Taxonomy | ParagraphType;

export default function EntityView({ project, entityType, entityId, onChange, onBack }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | undefined>();
  const [termName, setTermName] = useState('');
  const [termParentId, setTermParentId] = useState('');
  const [confirmField, setConfirmField] = useState<Field | null>(null);
  const [confirmTermId, setConfirmTermId] = useState<string | null>(null);

  const getEntityList = (): AnyEntity[] => {
    switch (entityType) {
      case 'contentType': return project.contentTypes;
      case 'taxonomy': return project.taxonomies;
      case 'paragraph': return project.paragraphTypes;
      case 'customField': return project.customFieldTypes;
      case 'loader': return project.loaderTypes;
    }
  };

  const entity = getEntityList().find((e) => e.id === entityId);
  if (!entity) return null;

  const taxonomy = entityType === 'taxonomy' ? (entity as Taxonomy) : null;

  const now = () => new Date().toISOString();

  const updateFields = (fields: Field[]) => {
    const updated = { ...project, updatedAt: now() } as Project;
    switch (entityType) {
      case 'contentType':
        updated.contentTypes = project.contentTypes.map((e) => e.id === entityId ? { ...e, fields, updatedAt: now() } : e);
        break;
      case 'taxonomy':
        updated.taxonomies = project.taxonomies.map((e) => e.id === entityId ? { ...e, fields } : e);
        break;
      case 'paragraph':
        updated.paragraphTypes = project.paragraphTypes.map((e) => e.id === entityId ? { ...e, fields } : e);
        break;
      case 'customField':
        updated.customFieldTypes = project.customFieldTypes.map((e) => e.id === entityId ? { ...e, fields } : e);
        break;
      case 'loader':
        updated.loaderTypes = project.loaderTypes.map((e) => e.id === entityId ? { ...e, fields } : e);
        break;
    }
    onChange(updated);
  };

  const updateTerms = (terms: TaxonomyTerm[]) => {
    const updated = { ...project, updatedAt: now() } as Project;
    updated.taxonomies = project.taxonomies.map((e) => e.id === entityId ? { ...e, terms } : e);
    onChange(updated);
  };

  const addTerm = () => {
    if (!termName.trim()) return;
    const newTerm: TaxonomyTerm = {
      id: uuid(),
      name: termName.trim(),
      parentId: termParentId || undefined,
    };
    updateTerms([...(taxonomy?.terms ?? []), newTerm]);
    setTermName('');
    setTermParentId('');
  };

  const deleteTerm = (termId: string) => {
    updateTerms((taxonomy?.terms ?? []).filter((t) => t.id !== termId));
  };

  const saveField = (field: Field) => {
    const existing = entity.fields.find((f) => f.id === field.id);
    const newFields = existing
      ? entity.fields.map((f) => (f.id === field.id ? field : f))
      : [...entity.fields, field];
    updateFields(newFields);
    setDialogOpen(false);
    setEditingField(undefined);
  };

  const deleteField = (id: string) => updateFields(entity.fields.filter((f) => f.id !== id));

  const openAdd = () => { setEditingField(undefined); setDialogOpen(true); };
  const openEdit = (field: Field) => { setEditingField(field); setDialogOpen(true); };

  const entityTypeLabel: Record<EntityType, string> = {
    contentType: 'Content Type',
    taxonomy: 'Taxonomy',
    paragraph: 'Paragraph Type',
    customField: 'Custom Field',
    loader: 'Loader',
  };

  const tabLabel: Record<EntityType, string> = {
    contentType: 'Content Types',
    taxonomy: 'Taxonomies',
    paragraph: 'Paragraph Types',
    customField: 'Custom Fields',
    loader: 'Loaders',
  };


  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b px-6 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          <span className="cursor-pointer hover:text-foreground" onClick={onBack}>{project.name}</span>
          <span>/</span>
          <span className="cursor-pointer hover:text-foreground" onClick={onBack}>{tabLabel[entityType]}</span>
          <span>/</span>
          <span className="text-foreground font-medium">{entity.label}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold">{entity.label}</h2>
              <Badge variant="outline" className="font-mono text-xs">{entity.machineName}</Badge>
            </div>
            {entity.description && (
              <p className="text-sm text-muted-foreground">{entity.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {(entityType === 'paragraph' || entityType === 'customField' || entityType === 'loader') && (
              <Button variant="outline" size="sm" onClick={() => downloadParagraphModule(entity as ParagraphType)}>
                <Download className="h-4 w-4 mr-1.5" />
                Download modulo
              </Button>
            )}
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1.5" />
              Aggiungi Campo
            </Button>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Campi */}
        {entity.fields.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            <p className="text-base font-medium">Nessun campo</p>
            <p className="text-sm mt-1">Aggiungi i campi di questo {entityTypeLabel[entityType]}.</p>
            <Button className="mt-4" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Campo
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Machine name</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Obbligatorio</TableHead>
                  <TableHead className="text-center">Multiplo</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entity.fields.map((field) => {
                  const typeInfo = getFieldTypeInfo(field.type);
                  return (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.label}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{field.machineName}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[typeInfo?.category ?? ''] ?? 'bg-muted text-muted-foreground border-border'}`}>
                          {typeInfo?.label ?? field.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {field.required ? <Badge variant="destructive" className="text-xs">Sì</Badge> : <span className="text-muted-foreground text-xs">No</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {field.multiple ? <Badge variant="secondary" className="text-xs">Sì</Badge> : <span className="text-muted-foreground text-xs">No</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(field)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setConfirmField(field)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Termini — solo per taxonomy */}
        {taxonomy && (
          <>
            <Separator className="my-8" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Termini</h3>
              <Badge variant="secondary">{taxonomy.terms?.length ?? 0} termini</Badge>
            </div>

            {/* Lista termini */}
            {(taxonomy.terms?.length ?? 0) > 0 && (
              <div className="rounded-lg border overflow-hidden mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      {taxonomy.hierarchical && <TableHead>Genitore</TableHead>}
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxonomy.terms.map((term) => (
                      <TableRow key={term.id}>
                        <TableCell className="font-medium">{term.name}</TableCell>
                        {taxonomy.hierarchical && (
                          <TableCell className="text-sm text-muted-foreground">
                            {taxonomy.terms.find((p) => p.id === term.parentId)?.name ?? '—'}
                          </TableCell>
                        )}
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setConfirmTermId(term.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Form aggiunta termine */}
            <div className="border rounded-lg p-4 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Aggiungi termine</p>
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-36 space-y-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    value={termName}
                    onChange={(e) => setTermName(e.target.value)}
                    placeholder="es. Sport"
                    onKeyDown={(e) => e.key === 'Enter' && addTerm()}
                  />
                </div>
                {taxonomy.hierarchical && (
                  <div className="flex-1 min-w-36 space-y-1">
                    <Label className="text-xs">Genitore</Label>
                    <Select value={termParentId} onValueChange={(v) => setTermParentId(v ?? '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Nessuno" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nessuno</SelectItem>
                        {taxonomy.terms.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-end">
                  <Button onClick={addTerm} disabled={!termName.trim()}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Aggiungi
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <ConfirmDialog
        open={confirmField !== null}
        title={`Eliminare il campo "${confirmField?.label}"?`}
        description="L'operazione è irreversibile."
        onConfirm={() => { if (confirmField) deleteField(confirmField.id); setConfirmField(null); }}
        onCancel={() => setConfirmField(null)}
      />
      <ConfirmDialog
        open={confirmTermId !== null}
        title="Eliminare il termine?"
        description="L'operazione è irreversibile."
        onConfirm={() => { if (confirmTermId) deleteTerm(confirmTermId); setConfirmTermId(null); }}
        onCancel={() => setConfirmTermId(null)}
      />
      <FieldDialog
        open={dialogOpen}
        field={editingField}
        fieldPrefix={entityType === 'contentType' || entityType === 'paragraph' || entityType === 'customField' || entityType === 'loader' ? `${entity.machineName}_` : undefined}
        paragraphTypes={project.paragraphTypes}
        contentTypes={project.contentTypes}
        vocabularies={project.taxonomies}
        onSave={saveField}
        onClose={() => { setDialogOpen(false); setEditingField(undefined); }}
      />
    </div>
  );
}
