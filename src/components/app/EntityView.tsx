'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Project, Field, ContentType, Vocabulary, ParagraphType } from '@/lib/types';
import { EntityType } from '@/app/page';
import { CATEGORY_COLORS, getFieldTypeInfo } from '@/lib/drupal-fields';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeft, Plus, Trash2, Pencil, Database, Download, FileJson,
} from 'lucide-react';
import FieldDialog from './FieldDialog';

interface Props {
  project: Project;
  entityType: EntityType;
  entityId: string;
  onChange: (project: Project) => void;
  onBack: () => void;
}


type AnyEntity = ContentType | Vocabulary | ParagraphType;

export default function EntityView({ project, entityType, entityId, onChange, onBack }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | undefined>();

  const getEntityList = (): AnyEntity[] => {
    switch (entityType) {
      case 'contentType': return project.contentTypes;
      case 'vocabulary': return project.vocabularies;
      case 'paragraph': return project.paragraphTypes;
    }
  };

  const entity = getEntityList().find((e) => e.id === entityId);
  if (!entity) return null;

  const now = () => new Date().toISOString();

  const updateFields = (fields: Field[]) => {
    const updated = { ...project, updatedAt: now() } as Project;
    switch (entityType) {
      case 'contentType':
        updated.contentTypes = project.contentTypes.map((e) => e.id === entityId ? { ...e, fields, updatedAt: now() } : e);
        break;
      case 'vocabulary':
        updated.vocabularies = project.vocabularies.map((e) => e.id === entityId ? { ...e, fields } : e);
        break;
      case 'paragraph':
        updated.paragraphTypes = project.paragraphTypes.map((e) => e.id === entityId ? { ...e, fields } : e);
        break;
    }
    onChange(updated);
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

  const openAdd = () => {
    setEditingField(undefined);
    setDialogOpen(true);
  };

  const openEdit = (field: Field) => {
    setEditingField(field);
    setDialogOpen(true);
  };

  const entityTypeLabel: Record<EntityType, string> = {
    contentType: 'Content Type',
    vocabulary: 'Vocabulary',
    paragraph: 'Paragraph Type',
  };

  const tabLabel: Record<EntityType, string> = {
    contentType: 'Content Types',
    vocabulary: 'Vocabularies',
    paragraph: 'Paragraph Types',
  };

  const exportJson = () => {
    const data = JSON.stringify({ entity: entityTypeLabel[entityType], ...entity }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity.machineName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const rows = entity.fields.map((f) => ({
      'Label': f.label,
      'Machine name': f.machineName,
      'Tipo': getFieldTypeInfo(f.type)?.label ?? f.type,
      'Categoria': getFieldTypeInfo(f.type)?.category ?? '',
      'Obbligatorio': f.required ? 'Sì' : 'No',
      'Multiplo': f.multiple ? 'Sì' : 'No',
      'Descrizione': f.description ?? '',
      'Modulo Drupal': getFieldTypeInfo(f.type)?.drupalModule ?? '',
      'Target type': f.targetType ?? '',
      'Target bundles': (f.targetBundles ?? []).join(', '),
      'Taxonomy vocabulary': f.taxonomyVocabulary ?? '',
      'Valori consentiti': (f.allowedValues ?? []).map((v) => `${v.key}:${v.label}`).join(' | '),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, entity.machineName.slice(0, 31));
    XLSX.writeFile(wb, `${entity.machineName}.xlsx`);
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
            <Button variant="outline" size="sm" onClick={exportJson}>
              <FileJson className="h-4 w-4 mr-1.5" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <Download className="h-4 w-4 mr-1.5" />
              Excel
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1.5" />
              Aggiungi Campo
            </Button>
          </div>
        </div>

        <Separator className="mb-6" />

        {entity.fields.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
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
                  <TableHead className="w-[80px]" />
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
                        {field.required ? (
                          <Badge variant="destructive" className="text-xs">Sì</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {field.multiple ? (
                          <Badge variant="secondary" className="text-xs">Sì</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(field)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteField(field.id)}
                          >
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
      </main>

      <FieldDialog
        open={dialogOpen}
        field={editingField}
        paragraphTypes={project.paragraphTypes}
        contentTypes={project.contentTypes}
        vocabularies={project.vocabularies}
        onSave={saveField}
        onClose={() => { setDialogOpen(false); setEditingField(undefined); }}
      />
    </div>
  );
}
