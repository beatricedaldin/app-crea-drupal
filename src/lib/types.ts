export type FieldTypeKey =
  | 'string'
  | 'string_long'
  | 'text'
  | 'text_long'
  | 'text_with_summary'
  | 'integer'
  | 'decimal'
  | 'float'
  | 'boolean'
  | 'email'
  | 'telephone'
  | 'link'
  | 'datetime'
  | 'daterange'
  | 'image'
  | 'file'
  | 'entity_reference'
  | 'entity_reference_revisions'
  | 'list_string'
  | 'list_integer'
  | 'list_float'
  | 'address'
  | 'geofield'
  | 'video_embed_field';

export type EntityReferenceTarget = 'content_type' | 'taxonomy' | 'user' | 'media' | 'paragraph';

export type MediaSourceType = 'image' | 'video' | 'audio' | 'file' | 'remote_video';

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
  // entity_reference
  targetType?: EntityReferenceTarget;
  targetBundles?: string[];
  // list fields
  allowedValues?: ListOption[];
  // string
  maxLength?: number;
  // file / image
  allowedExtensions?: string;
  maxFileSize?: string;
  // datetime
  dateOnly?: boolean;
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

export interface Vocabulary {
  id: string;
  label: string;
  machineName: string;
  description?: string;
  hierarchical: boolean;
  fields: Field[];
}

export interface ParagraphType {
  id: string;
  label: string;
  machineName: string;
  description?: string;
  fields: Field[];
}

export interface MediaType {
  id: string;
  label: string;
  machineName: string;
  sourceType: MediaSourceType;
  fields: Field[];
}

export interface Project {
  id: string;
  name: string;
  clientName?: string;
  description?: string;
  contentTypes: ContentType[];
  vocabularies: Vocabulary[];
  paragraphTypes: ParagraphType[];
  mediaTypes: MediaType[];
  createdAt: string;
  updatedAt: string;
}
