'use client';

import { useState, useEffect } from 'react';
import { Field, FieldTypeKey, EntityReferenceTarget, ListOption } from '@/lib/types';
import { FIELD_TYPES, FIELD_CATEGORIES, CATEGORY_COLORS, getFieldTypeInfo } from '@/lib/drupal-fields';
import { toFieldMachineName } from '@/lib/utils-drupal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, X } from 'lucide-react';
import { v4 as uuid } from 'uuid';

interface Props {
  open: boolean;
  field?: Field;
  onSave: (field: Field) => void;
  onClose: () => void;
}

const defaultField = (): Omit<Field, 'id'> => ({
  label: '',
  machineName: '',
  type: 'string',
  required: false,
  multiple: false,
  description: '',
});

export default function FieldDialog({ open, field, onSave, onClose }: Props) {
  const [form, setForm] = useState(defaultField());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [allowedValues, setAllowedValues] = useState<ListOption[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    if (open) {
      if (field) {
        setForm({ ...field });
        setAllowedValues(field.allowedValues ?? []);
        setSelectedCategory(getFieldTypeInfo(field.type)?.category ?? null);
      } else {
        setForm(defaultField());
        setAllowedValues([]);
        setSelectedCategory(null);
      }
    }
  }, [open, field]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleLabelChange = (label: string) => {
    setForm((f) => ({
      ...f,
      label,
      machineName: field ? f.machineName : toFieldMachineName(label),
    }));
  };

  const addAllowedValue = () => {
    if (!newKey.trim()) return;
    setAllowedValues((v) => [...v, { key: newKey.trim(), label: newLabel.trim() || newKey.trim() }]);
    setNewKey('');
    setNewLabel('');
  };

  const removeAllowedValue = (idx: number) =>
    setAllowedValues((v) => v.filter((_, i) => i !== idx));

  const save = () => {
    if (!form.label.trim()) return;
    const saved: Field = {
      id: field?.id ?? uuid(),
      ...form,
      machineName: form.machineName.trim() || toFieldMachineName(form.label),
      label: form.label.trim(),
      description: form.description?.trim() || undefined,
      allowedValues: isListType(form.type) ? allowedValues : undefined,
      targetType: isRefType(form.type) ? form.targetType : undefined,
      targetBundles: isRefType(form.type) ? form.targetBundles : undefined,
      maxLength: form.type === 'string' ? form.maxLength : undefined,
      allowedExtensions: (form.type === 'file' || form.type === 'image') ? form.allowedExtensions : undefined,
      maxFileSize: (form.type === 'file' || form.type === 'image') ? form.maxFileSize : undefined,
      dateOnly: form.type === 'datetime' ? form.dateOnly : undefined,
    };
    onSave(saved);
  };

  const isListType = (t: FieldTypeKey) => t.startsWith('list_') || t === 'boolean';
  const isRefType = (t: FieldTypeKey) => t === 'entity_reference' || t === 'entity_reference_revisions';

  const typesByCategory = FIELD_CATEGORIES.reduce<Record<string, typeof FIELD_TYPES>>((acc, cat) => {
    acc[cat] = FIELD_TYPES.filter((f) => f.category === cat);
    return acc;
  }, {});

  const currentTypeInfo = getFieldTypeInfo(form.type);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{field ? 'Modifica Campo' : 'Nuovo Campo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Label + Machine name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-label">Label *</Label>
              <Input
                id="f-label"
                value={form.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="es. Titolo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-machine">Machine name</Label>
              <Input
                id="f-machine"
                value={form.machineName}
                onChange={(e) => set('machineName', e.target.value)}
                className="font-mono text-sm"
                placeholder="es. field_titolo"
              />
            </div>
          </div>

          {/* Tipo campo */}
          <div className="space-y-2">
            <Label>Tipo di campo *</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {FIELD_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedCategory === cat
                      ? CATEGORY_COLORS[cat]
                      : 'bg-muted text-muted-foreground border-transparent hover:border-border'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {(selectedCategory ? typesByCategory[selectedCategory] : FIELD_TYPES).map((ft) => (
                <button
                  key={ft.key}
                  type="button"
                  onClick={() => set('type', ft.key)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    form.type === ft.key
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="font-medium text-xs">{ft.label}</div>
                  {ft.drupalModule && (
                    <div className="text-xs text-muted-foreground mt-0.5">mod: {ft.drupalModule}</div>
                  )}
                </button>
              ))}
            </div>
            {currentTypeInfo && (
              <p className="text-xs text-muted-foreground mt-1 px-1">{currentTypeInfo.description}</p>
            )}
          </div>

          <Separator />

          {/* Required / Multiple */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch id="f-required" checked={form.required} onCheckedChange={(v) => set('required', v)} />
              <Label htmlFor="f-required">Obbligatorio</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="f-multiple" checked={form.multiple} onCheckedChange={(v) => set('multiple', v)} />
              <Label htmlFor="f-multiple">Valori multipli</Label>
            </div>
          </div>

          {/* Descrizione */}
          <div className="space-y-1.5">
            <Label htmlFor="f-desc">Descrizione / Note</Label>
            <Textarea
              id="f-desc"
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="Note per lo sviluppatore..."
            />
          </div>

          {/* Opzioni condizionali */}
          {form.type === 'string' && (
            <div className="space-y-1.5">
              <Label htmlFor="f-maxlen">Lunghezza massima</Label>
              <Input
                id="f-maxlen"
                type="number"
                value={form.maxLength ?? ''}
                onChange={(e) => set('maxLength', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="255"
                className="w-32"
              />
            </div>
          )}

          {(form.type === 'file' || form.type === 'image') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-ext">Estensioni consentite</Label>
                <Input
                  id="f-ext"
                  value={form.allowedExtensions ?? ''}
                  onChange={(e) => set('allowedExtensions', e.target.value)}
                  placeholder="jpg jpeg png webp"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-size">Dimensione massima</Label>
                <Input
                  id="f-size"
                  value={form.maxFileSize ?? ''}
                  onChange={(e) => set('maxFileSize', e.target.value)}
                  placeholder="es. 10 MB"
                />
              </div>
            </div>
          )}

          {form.type === 'datetime' && (
            <div className="flex items-center gap-2">
              <Switch id="f-dateonly" checked={form.dateOnly ?? false} onCheckedChange={(v) => set('dateOnly', v)} />
              <Label htmlFor="f-dateonly">Solo data (senza ora)</Label>
            </div>
          )}

          {isRefType(form.type) && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-target">Tipo di entità target</Label>
                <Select
                  value={form.targetType ?? ''}
                  onValueChange={(v) => set('targetType', v as EntityReferenceTarget)}
                >
                  <SelectTrigger id="f-target">
                    <SelectValue placeholder="Seleziona tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="content_type">Content Type</SelectItem>
                    <SelectItem value="taxonomy">Taxonomy</SelectItem>
                    <SelectItem value="user">Utente</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="paragraph">Paragraph</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-bundles">Bundle target (opzionale)</Label>
                <Input
                  id="f-bundles"
                  value={(form.targetBundles ?? []).join(', ')}
                  onChange={(e) => set('targetBundles', e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : undefined)}
                  placeholder="es. articolo, pagina"
                />
              </div>
            </div>
          )}

          {isListType(form.type) && form.type !== 'boolean' && (
            <div className="space-y-2">
              <Label>Valori consentiti</Label>
              <div className="space-y-1.5 mb-2">
                {allowedValues.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="font-mono">{v.key}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <span>{v.label}</span>
                    <button type="button" onClick={() => removeAllowedValue(i)} className="ml-auto text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="chiave"
                  className="font-mono text-sm w-32"
                />
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="label"
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && addAllowedValue()}
                />
                <Button type="button" variant="outline" size="icon" onClick={addAllowedValue}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={save} disabled={!form.label.trim()}>
            {field ? 'Salva' : 'Aggiungi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
