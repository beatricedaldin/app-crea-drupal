import { Field } from './types';

export interface CustomFieldPreset {
  label: string;
  machineName: string;
  description?: string;
  fields: Omit<Field, 'id'>[];
}

export const CUSTOM_FIELD_PRESETS: CustomFieldPreset[] = [
  {
    label: 'Image Item',
    machineName: 'image_item',
    description: 'Elemento media (immagine o video) con didascalia. Da usare in modo multiplo in paragraph come gallery o slider.',
    fields: [
      {
        label: 'Media',
        machineName: 'media',
        type: 'media',
        required: false,
        multiple: false,
        targetBundles: ['image', 'video'],
      },
      {
        label: 'Caption',
        machineName: 'caption',
        type: 'plain_text_long',
        required: false,
        multiple: false,
      },
    ],
  },
  {
    label: 'Iframe Item',
    machineName: 'iframe_item',
    description: 'Elemento video con codice embed, media video e didascalia.',
    fields: [
      {
        label: 'Codice embed',
        machineName: 'embed',
        type: 'plain_text_long',
        required: false,
        multiple: false,
      },
      {
        label: 'Media',
        machineName: 'media',
        type: 'media',
        required: false,
        multiple: false,
        targetBundles: ['video'],
      },
      {
        label: 'Caption',
        machineName: 'caption',
        type: 'plain_text_long',
        required: false,
        multiple: false,
      },
    ],
  },
];
