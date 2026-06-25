'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project } from '@/lib/types';
import { loadProjects, saveProjects } from '@/lib/storage';
import ProjectsView from '@/components/app/ProjectsView';
import ProjectView from '@/components/app/ProjectView';
import EntityView from '@/components/app/EntityView';

export type EntityType = 'contentType' | 'taxonomy' | 'paragraph' | 'customField' | 'loader';
export type ProjectTab = 'contentTypes' | 'taxonomies' | 'paragraphs' | 'customFields' | 'loaders';

export type Nav =
  | { view: 'projects' }
  | { view: 'project'; projectId: string; tab: ProjectTab }
  | { view: 'entity'; projectId: string; entityType: EntityType; entityId: string };

export function entityTypeToTab(et: EntityType): ProjectTab {
  const map: Record<EntityType, ProjectTab> = {
    contentType: 'contentTypes',
    taxonomy: 'taxonomies',
    paragraph: 'paragraphs',
    customField: 'customFields',
    loader: 'loaders',
  };
  return map[et];
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [nav, setNav] = useState<Nav>({ view: 'projects' });

  useEffect(() => {
    setProjects(loadProjects());
  }, []);

  const commit = useCallback((updated: Project[]) => {
    setProjects(updated);
    saveProjects(updated);
  }, []);

  const updateProject = useCallback(
    (updated: Project) => commit(projects.map(p => (p.id === updated.id ? updated : p))),
    [projects, commit],
  );

  if (nav.view === 'projects') {
    return (
      <ProjectsView
        projects={projects}
        onChange={commit}
        onOpen={(id) => setNav({ view: 'project', projectId: id, tab: 'contentTypes' })}
      />
    );
  }

  const project = projects.find(p => p.id === nav.projectId);
  if (!project) {
    setNav({ view: 'projects' });
    return null;
  }

  if (nav.view === 'project') {
    return (
      <ProjectView
        project={project}
        tab={nav.tab}
        onTabChange={(tab) => setNav({ ...nav, tab })}
        onChange={updateProject}
        onBack={() => setNav({ view: 'projects' })}
        onOpenEntity={(entityType, entityId) =>
          setNav({ view: 'entity', projectId: nav.projectId, entityType, entityId })
        }
      />
    );
  }

  if (nav.view === 'entity') {
    return (
      <EntityView
        project={project}
        entityType={nav.entityType}
        entityId={nav.entityId}
        onChange={updateProject}
        onBack={() =>
          setNav({ view: 'project', projectId: nav.projectId, tab: entityTypeToTab(nav.entityType) })
        }
      />
    );
  }

  return null;
}
