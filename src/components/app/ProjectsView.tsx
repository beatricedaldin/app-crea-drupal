'use client';

import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Project } from '@/lib/types';
import { formatDate } from '@/lib/utils-drupal';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, FolderOpen, Database } from 'lucide-react';

interface Props {
  projects: Project[];
  onChange: (projects: Project[]) => void;
  onOpen: (id: string) => void;
}

const emptyForm = { name: '', clientName: '', description: '' };

export default function ProjectsView({ projects, onChange, onOpen }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const createProject = () => {
    if (!form.name.trim()) return;
    const now = new Date().toISOString();
    const project: Project = {
      id: uuid(),
      name: form.name.trim(),
      clientName: form.clientName.trim() || undefined,
      description: form.description.trim() || undefined,
      contentTypes: [],
      vocabularies: [],
      paragraphTypes: [],
      createdAt: now,
      updatedAt: now,
    };
    onChange([...projects, project]);
    setForm(emptyForm);
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Drupal Architect</h1>
            <p className="text-xs text-muted-foreground">Progetta la struttura dei tuoi siti Drupal</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Progetto
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
          Progetti ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-xl">
            <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-base font-medium">Nessun progetto</p>
            <p className="text-sm mt-1">Crea il tuo primo progetto per iniziare a strutturare Drupal.</p>
            <Button className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Progetto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Card key={p.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  {p.clientName && <CardDescription>{p.clientName}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-1 pb-2">
                  {p.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{p.contentTypes.length} Content Types</Badge>
                    <Badge variant="secondary">{p.vocabularies.length} Vocabularies</Badge>
                    <Badge variant="secondary">{p.paragraphTypes.length} Paragraphs</Badge>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-3 border-t">
                  <span className="text-xs text-muted-foreground">{formatDate(p.updatedAt)}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onChange(projects.filter((x) => x.id !== p.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => onOpen(p.id)}>
                      <FolderOpen className="h-4 w-4 mr-1.5" />
                      Apri
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Progetto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nome progetto *</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="es. Sito Istituzionale"
                onKeyDown={(e) => e.key === 'Enter' && createProject()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-client">Cliente</Label>
              <Input
                id="p-client"
                value={form.clientName}
                onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                placeholder="es. Comune di Milano"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Descrizione</Label>
              <Textarea
                id="p-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Note opzionali..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button onClick={createProject} disabled={!form.name.trim()}>
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
