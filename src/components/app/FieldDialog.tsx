'use client';

import { useState, useEffect } from 'react';
import { Field, FieldTypeKey, EntityReferenceTarget, ListOption, ParagraphType, ContentType, Taxonomy } from '@/lib/types';
import { FIELD_TYPES, FIELD_CATEGORIES, CATEGORY_COLORS, getFieldTypeInfo } from '@/lib/drupal-fields';
import { toFieldMachineName, toMachineName } from '@/lib/utils-drupal';
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
  fieldPrefix?: string;
  paragraphTypes: ParagraphType[];
  contentTypes: ContentType[];
  vocabularies: Taxonomy[];
  onSave: (field: Field) => void;
  onClose: () => void;
}

const defaultField = (): Omit<Field, 'id'> => ({
  label: '',
  machineName: '',
  type: 'plain_text',
  required: false,
  multiple: false,
  description: '',
});

export default function FieldDialog({ open, field, fieldPrefix, paragraphTypes, contentTypes, vocabularies, onSave, onClose }: Props) {
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

  const autoMachineName = (label: string) =>
    fieldPrefix ? `${fieldPrefix}${toMachineName(label)}` : toFieldMachineName(label);

  const handleLabelChange = (label: string) => {
    setForm((f) => ({
      ...f,
      label,
      machineName: field ? f.machineName : autoMachineName(label),
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
      machineName: form.machineName.trim() || autoMachineName(form.label),
      label: form.label.trim(),
      description: form.description?.trim() || undefined,
      allowedValues: isListType(form.type) ? allowedValues : undefined,
      targetType: isRefType(form.type) ? form.targetType : undefined,
      targetBundles: isRefType(form.type) ? form.targetBundles : undefined,
      taxonomyVocabulary: form.type === 'taxonomy' ? form.taxonomyVocabulary : undefined,
      dateOnly: form.type === 'datetime' ? (form.dateOnly ?? true) : undefined,
      dateFormat: form.type === 'datetime' ? (form.dateFormat || "m-Y-d\\TH:i:s") : undefined,
    };
    onSave(saved);
  };

  const isListType = (t: FieldTypeKey) => t === 'list' || t === 'radio';
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
                  onClick={() => {
                    const newCat = selectedCategory === cat ? null : cat;
                    setSelectedCategory(newCat);
                    // Se il tipo corrente non appartiene alla nuova categoria, auto-seleziona il primo tipo
                    if (newCat && getFieldTypeInfo(form.type)?.category !== newCat) {
                      const first = typesByCategory[newCat]?.[0];
                      if (first) {
                        setForm((f) => ({
                          label: f.label,
                          machineName: f.machineName,
                          description: f.description,
                          required: f.required,
                          multiple: f.multiple,
                          type: first.key,
                          dateOnly: first.key === 'datetime' ? true : undefined,
                          dateFormat: first.key === 'datetime' ? "m-Y-d\\TH:i:s" : undefined,
                          targetType: undefined,
                          targetBundles: undefined,
                          taxonomyVocabulary: undefined,
                          allowedValues: undefined,
                        }));
                        setAllowedValues([]);
                      }
                    }
                  }}
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
                  onClick={() => {
                    setForm((f) => ({
                      label: f.label,
                      machineName: f.machineName,
                      description: f.description,
                      required: f.required,
                      multiple: f.multiple,
                      type: ft.key,
                      dateOnly: ft.key === 'datetime' ? true : undefined,
                      dateFormat: ft.key === 'datetime' ? "m-Y-d\\TH:i:s" : undefined,
                      targetType: undefined,
                      targetBundles: undefined,
                      taxonomyVocabulary: undefined,
                      allowedValues: undefined,
                    }));
                    setAllowedValues([]);
                  }}
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

          {/* Opzioni condizionali — key={form.type} garantisce smontaggio completo al cambio tipo */}
          <div key={form.type}>
          {form.type === 'taxonomy' && (
            <div className="space-y-1.5">
              <Label>Vocabulary</Label>
              {vocabularies.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nessuna Taxonomy ancora — creane una nella sezione Vocabularies.</p>
              ) : (
                <div className="flex flex-col gap-1.5 border rounded-lg p-3">
                  {vocabularies.map((v) => {
                    const checked = (form.taxonomyVocabulary ?? '') === v.machineName;
                    return (
                      <label key={v.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="taxonomy-vocab"
                          checked={checked}
                          onChange={() => set('taxonomyVocabulary', v.machineName)}
                        />
                        <span className="font-medium">{v.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">{v.machineName}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {form.type === 'datetime' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch id="f-dateonly" checked={form.dateOnly ?? true} onCheckedChange={(v) => set('dateOnly', v)} />
                <Label htmlFor="f-dateonly">Solo data (senza ora)</Label>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-dateformat">Formato data (PHP)</Label>
                <Input
                  id="f-dateformat"
                  value={form.dateFormat ?? "m-Y-d\\TH:i:s"}
                  onChange={(e) => set('dateFormat', e.target.value)}
                  className="font-mono text-sm"
                  placeholder="m-Y-d\TH:i:s"
                />
                <p className="text-xs text-muted-foreground">
                  Es: <code>d/m/Y</code> solo data · <code>m-Y-d\TH:i:s</code> data e ora
                </p>
              </div>
            </div>
          )}

          {form.type === 'entity_reference' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-target">Tipo di entità target</Label>
                <Select
                  value={form.targetType ?? ''}
                  onValueChange={(v) => set('targetType', v as EntityReferenceTarget)}
                >
                  <SelectTrigger id="f-target" className="w-full">
                    <SelectValue placeholder="Seleziona tipo..." />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="node_type">node_type — definizione CT (CT indice)</SelectItem>
                    <SelectItem value="node">node — nodo (contenuto)</SelectItem>
                    <SelectItem value="user">user — utente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.targetType === 'node' && (
                <div className="space-y-1.5">
                  <Label>Content Types</Label>
                  {contentTypes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nessun Content Type ancora — creane uno nella sezione Content Types.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5 border rounded-lg p-3">
                      {contentTypes.map((ct) => {
                        const checked = (form.targetBundles ?? []).includes(ct.machineName);
                        return (
                          <label key={ct.id} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const current = form.targetBundles ?? [];
                                set('targetBundles', e.target.checked
                                  ? [...current, ct.machineName]
                                  : current.filter((b) => b !== ct.machineName));
                              }}
                            />
                            <span className="font-medium">{ct.label}</span>
                            <span className="font-mono text-xs text-muted-foreground">{ct.machineName}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {form.type === 'entity_reference_revisions' && (
            <div className="space-y-1.5">
              <Label>Paragraph types</Label>
              {paragraphTypes.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nessun Paragraph Type ancora — creane uno nella sezione Paragrafi.</p>
              ) : (
                <div className="flex flex-col gap-1.5 border rounded-lg p-3">
                  {paragraphTypes.map((pt) => {
                    const checked = (form.targetBundles ?? []).includes(pt.machineName);
                    return (
                      <label key={pt.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = form.targetBundles ?? [];
                            set('targetBundles', e.target.checked
                              ? [...current, pt.machineName]
                              : current.filter((b) => b !== pt.machineName));
                          }}
                        />
                        <span className="font-medium">{pt.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">{pt.machineName}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {isListType(form.type) && (
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
