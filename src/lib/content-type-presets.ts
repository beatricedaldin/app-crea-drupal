import { Field } from './types';

export interface ContentTypePreset {
  label: string;
  machineName: string;
  description?: string;
  fields: Omit<Field, 'id'>[];
}

export const CONTENT_TYPE_PRESETS: ContentTypePreset[] = [
  {
    label: 'Indice',
    machineName: 'index',
    description: 'Content type indice con riferimento a CT, testi e media raggruppati.',
    fields: [
      { label: 'Index of',              machineName: 'index_of',           type: 'entity_reference',            required: false, multiple: false, targetType: 'node_type' },
      { label: 'Occhiello',             machineName: 'overtitle',          type: 'plain_text_long',             required: false, multiple: false },
      { label: 'Titolo alternativo',    machineName: 'titolo_alternativo', type: 'plain_text_long',             required: false, multiple: false },
      { label: 'Descrizione',           machineName: 'body',               type: 'formatted_text_with_summary', required: false, multiple: false },
      { label: 'Immagine di copertina', machineName: 'copertina',          type: 'media_image',                 required: false, multiple: false, group: 'Media' },
      { label: 'Immagine di anteprima', machineName: 'anteprima',          type: 'media_image',                 required: false, multiple: false, group: 'Media' },
    ],
  },
  {
    label: 'Pagina',
    machineName: 'page',
    description: 'Content type pagina con testi, immagini raggruppate e checkbox dettaglio.',
    fields: [
      { label: 'Overtitle',              machineName: 'overtitle',         type: 'plain_text_long',             required: false, multiple: false },
      { label: 'Titolo alternativo',     machineName: 'title_alt',         type: 'plain_text_long',             required: false, multiple: false },
      { label: 'Label',                  machineName: 'label',             type: 'plain_text',                  required: false, multiple: false },
      { label: 'Descrizione',            machineName: 'body',              type: 'formatted_text_with_summary', required: false, multiple: false },
      { label: 'Immagine di anteprima',  machineName: 'preview_image',     type: 'media_image',                 required: false, multiple: false, group: 'Immagini' },
      { label: 'Immagine principale',    machineName: 'main_image',        type: 'media_image',                 required: false, multiple: true,  group: 'Immagini' },
      { label: 'Immagine mobile',        machineName: 'mobile_image',      type: 'media_image',                 required: false, multiple: false, group: 'Immagini' },
      { label: 'Nascondi dettaglio pagina', machineName: 'hide_page_details', type: 'boolean',                 required: false, multiple: false },
    ],
  },
];
