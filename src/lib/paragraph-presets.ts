import { Field } from './types';

export interface ParagraphPreset {
  label: string;
  machineName: string;
  description?: string;
  fields: Omit<Field, 'id'>[];
}

export const PARAGRAPH_PRESETS: ParagraphPreset[] = [
  {
    label: 'Text',
    machineName: 'text',
    description: 'Blocco testo con titoli, corpo, link e allegato.',
    fields: [
      { label: 'Overtitle',   machineName: 'overtitle',   type: 'plain_text_long',              required: false, multiple: false },
      { label: 'Title',       machineName: 'title',       type: 'plain_text_long',              required: false, multiple: false },
      { label: 'Body',        machineName: 'body',        type: 'formatted_text_with_summary',  required: false, multiple: false },
      { label: 'Link',        machineName: 'link',        type: 'custom_link',                  required: false, multiple: false },
      { label: 'Attachment',  machineName: 'attachment',  type: 'media_document',               required: false, multiple: false },
    ],
    // field machineName values are base names — prefixed with the paragraph machineName at creation time
  },
];
