export type FieldTypeKey =
  | 'plain_text'
  | 'plain_text_long'
  | 'formatted_text_long'
  | 'formatted_text_with_summary'
  | 'list'
  | 'radio'
  | 'integer'
  | 'decimal'
  | 'float'
  | 'boolean'
  | 'custom_link'
  | 'datetime'
  | 'daterange'
  | 'media_image'
  | 'media_video'
  | 'media_audio'
  | 'media_document'
  | 'media'
  | 'taxonomy'
  | 'entity_reference'
  | 'entity_reference_revisions';

export type EntityReferenceTarget = 'node_type' | 'node' | 'user';

export interface ListOption {
  key: string;
  label: string;
}

export interface Field {
  id: string;
  label: string;
  machineName: string;
  type: FieldTypeKey;
  required: boolean;
  multiple: boolean;
  description?: string;
  targetType?: EntityReferenceTarget;
  targetBundles?: string[];
  taxonomyVocabulary?: string;
  allowedValues?: ListOption[];
  dateOnly?: boolean;
  dateFormat?: string;
}

export interface TaxonomyTerm {
  id: string;
  name: string;
  parentId?: string;
}

export interface ContentType {
  id: string;
  label: string;
  machineName: string;
  description?: string;
  fields: Field[];
  createdAt: string;
  updatedAt: string;
}

export interface Taxonomy {
  id: string;
  label: string;
  machineName: string;
  description?: string;
  hierarchical: boolean;
  fields: Field[];
  terms: TaxonomyTerm[];
}

export interface ParagraphType {
  id: string;
  label: string;
  machineName: string;
  description?: string;
  fields: Field[];
}

export interface Project {
  id: string;
  name: string;
  clientName?: string;
  description?: string;
  contentTypes: ContentType[];
  taxonomies: Taxonomy[];
  paragraphTypes: ParagraphType[];
  customFieldTypes: ParagraphType[];
  createdAt: string;
  updatedAt: string;
}
