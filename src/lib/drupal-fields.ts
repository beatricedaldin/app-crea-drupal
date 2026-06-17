import { FieldTypeKey } from './types';

export interface FieldTypeInfo {
  key: FieldTypeKey;
  label: string;
  description: string;
  category: string;
  drupalModule?: string;
}

export const FIELD_TYPES: FieldTypeInfo[] = [
  // Testo
  { key: 'plain_text',                   label: 'Plain text',                    description: 'Testo semplice, max 255 caratteri. Usato per titoli, nomi.',            category: 'Testo' },
  { key: 'plain_text_long',              label: 'Plain text long',               description: 'Testo semplice senza limite di caratteri, nessun editor.',              category: 'Testo' },
  { key: 'formatted_text',              label: 'Formatted text',                description: 'Testo con editor WYSIWYG (CKEditor). Max 255 caratteri.',               category: 'Testo' },
  { key: 'formatted_text_long',         label: 'Formatted text long',           description: 'Testo lungo con editor WYSIWYG. Campo standard per contenuti.',         category: 'Testo' },
  { key: 'formatted_text_with_summary', label: 'Formatted text with summary',   description: 'Campo body con teaser/anteprima separata. Usato per articoli e pagine.', category: 'Testo' },
  { key: 'list',                        label: 'List',                          description: 'Selezione da un elenco di valori predefiniti (select/checkbox).',        category: 'Testo' },
  { key: 'radio',                       label: 'Radio',                         description: 'Selezione singola tramite radio button da valori predefiniti.',          category: 'Testo' },

  // Numero
  { key: 'integer',  label: 'Numero intero',   description: 'Numero senza decimali (es. 42, -10, 0).',                category: 'Numero' },
  { key: 'decimal',  label: 'Numero decimale',  description: 'Numero con precisione decimale fissa (es. prezzo).',    category: 'Numero' },
  { key: 'float',    label: 'Numero float',     description: 'Numero in virgola mobile (es. valori scientifici).',    category: 'Numero' },

  // Booleano
  { key: 'boolean', label: 'Booleano (Sì/No)', description: 'Checkbox o toggle vero/falso.', category: 'Booleano' },

  // Link
  { key: 'custom_link', label: 'Link', description: 'Campo custom con stringa integrata + URL. Storage type: custom_link. Widget: custom_link.', category: 'Link' },

  // Data
  { key: 'datetime',   label: 'Data / Data e ora',   description: 'Selettore data con opzione ora. Formato PHP date (default: m-Y-d\\TH:i:s). Widget: datetime_default.',  category: 'Data' },
  { key: 'daterange',  label: 'Intervallo di date',  description: 'Data di inizio e fine (es. evento, periodo).',                                                          category: 'Data' },

  // Media
  { key: 'media_image',    label: 'Immagine',   description: 'Riferimento a entità Media bundle: image.',    category: 'Media' },
  { key: 'media_video',    label: 'Video',      description: 'Riferimento a entità Media bundle: video.',    category: 'Media' },
  { key: 'media_audio',    label: 'Audio',      description: 'Riferimento a entità Media bundle: audio.',    category: 'Media' },
  { key: 'media_document', label: 'Document',   description: 'Riferimento a entità Media bundle: document.', category: 'Media' },

  // Riferimento
  { key: 'entity_reference',           label: 'Riferimento entità',     description: 'Collegamento a node, node_type (CT indice) o user. Widget: options_select.',              category: 'Riferimento' },
  { key: 'entity_reference_revisions', label: 'Riferimento paragrafo',  description: 'Collegamento a paragraph type (revisionabile). Modulo Paragraphs.',                      category: 'Riferimento', drupalModule: 'paragraphs' },
  { key: 'taxonomy',                   label: 'Tassonomia',             description: 'Riferimento a termine di tassonomia. Specificare il vocabulary machine name.',           category: 'Riferimento' },

];

export const FIELD_CATEGORIES = [...new Set(FIELD_TYPES.map(f => f.category))];

export function getFieldTypeInfo(key: FieldTypeKey): FieldTypeInfo | undefined {
  return FIELD_TYPES.find(f => f.key === key);
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Testo':       'bg-blue-100 text-blue-800 border-blue-200',
  'Numero':      'bg-violet-100 text-violet-800 border-violet-200',
  'Booleano':    'bg-amber-100 text-amber-800 border-amber-200',
  'Link':        'bg-green-100 text-green-800 border-green-200',
  'Data':        'bg-orange-100 text-orange-800 border-orange-200',
  'Media':       'bg-pink-100 text-pink-800 border-pink-200',
  'Riferimento': 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

