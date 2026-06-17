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
  { key: 'string',             label: 'Testo breve (plain)',       description: 'Testo semplice, max 255 caratteri. Usato per titoli, nomi.',           category: 'Testo' },
  { key: 'string_long',        label: 'Testo lungo (plain)',        description: 'Testo semplice senza limite di caratteri, nessun editor.',             category: 'Testo' },
  { key: 'text',               label: 'Testo formattato',           description: 'Testo con editor WYSIWYG (CKEditor). Max 255 caratteri.',              category: 'Testo' },
  { key: 'text_long',          label: 'Testo formattato lungo',     description: 'Testo lungo con editor WYSIWYG. Campo standard per contenuti.',        category: 'Testo' },
  { key: 'text_with_summary',  label: 'Testo con sommario (Body)',  description: 'Campo body con teaser/anteprima separata. Usato per articoli e pagine.', category: 'Testo' },

  // Numero
  { key: 'integer',  label: 'Numero intero',   description: 'Numero senza decimali (es. 42, -10, 0).',                category: 'Numero' },
  { key: 'decimal',  label: 'Numero decimale',  description: 'Numero con precisione decimale fissa (es. prezzo).',    category: 'Numero' },
  { key: 'float',    label: 'Numero float',     description: 'Numero in virgola mobile (es. valori scientifici).',    category: 'Numero' },

  // Selezione
  { key: 'list_string',   label: 'Lista (testo)',   description: 'Menu a tendina / radio button con valori testuali predefiniti.', category: 'Selezione' },
  { key: 'list_integer',  label: 'Lista (intero)',  description: 'Menu a tendina con valori numerici interi predefiniti.',         category: 'Selezione' },
  { key: 'list_float',    label: 'Lista (decimale)', description: 'Menu a tendina con valori decimali predefiniti.',               category: 'Selezione' },
  { key: 'boolean',       label: 'Booleano (Sì/No)', description: 'Checkbox o toggle vero/falso.',                                category: 'Selezione' },

  // Contatto
  { key: 'email',     label: 'Email',    description: 'Indirizzo email con validazione formato.',        category: 'Contatto' },
  { key: 'telephone', label: 'Telefono', description: 'Numero di telefono.',                            category: 'Contatto' },
  { key: 'link',      label: 'Link/URL', description: 'URL con titolo link opzionale.',                 category: 'Contatto' },

  // Data
  { key: 'datetime',   label: 'Data / Data e ora',   description: 'Selettore data con opzione ora. ISO 8601.',      category: 'Data' },
  { key: 'daterange',  label: 'Intervallo di date',  description: 'Data di inizio e fine (es. evento, periodo).',  category: 'Data' },

  // Media
  { key: 'image',             label: 'Immagine',     description: 'Upload immagine (jpg, png, webp, gif). Include alt text.',   category: 'Media' },
  { key: 'file',              label: 'File',         description: 'Upload file generico (pdf, zip, doc, ecc.).',                category: 'Media' },
  { key: 'video_embed_field', label: 'Video Embed',  description: 'URL YouTube/Vimeo con embed automatico.',                   category: 'Media', drupalModule: 'video_embed_field' },

  // Riferimento
  { key: 'entity_reference',           label: 'Riferimento entità',     description: 'Collegamento a content type, tassonomia, utente o media entity.',  category: 'Riferimento' },
  { key: 'entity_reference_revisions', label: 'Riferimento paragrafo',  description: 'Collegamento a paragraph type (revisionabile). Modulo Paragraphs.', category: 'Riferimento', drupalModule: 'paragraphs' },

  // Avanzato
  { key: 'address',  label: 'Indirizzo',               description: 'Campo indirizzo strutturato (via, città, CAP, paese). Modulo Address.',     category: 'Avanzato', drupalModule: 'address' },
  { key: 'geofield', label: 'Coordinate geografiche',  description: 'Latitudine e longitudine. Modulo Geofield.',                               category: 'Avanzato', drupalModule: 'geofield' },
];

export const FIELD_CATEGORIES = [...new Set(FIELD_TYPES.map(f => f.category))];

export function getFieldTypeInfo(key: FieldTypeKey): FieldTypeInfo | undefined {
  return FIELD_TYPES.find(f => f.key === key);
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Testo':       'bg-blue-100 text-blue-800 border-blue-200',
  'Numero':      'bg-violet-100 text-violet-800 border-violet-200',
  'Selezione':   'bg-amber-100 text-amber-800 border-amber-200',
  'Contatto':    'bg-green-100 text-green-800 border-green-200',
  'Data':        'bg-orange-100 text-orange-800 border-orange-200',
  'Media':       'bg-pink-100 text-pink-800 border-pink-200',
  'Riferimento': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Avanzato':    'bg-slate-100 text-slate-700 border-slate-200',
};

export const MEDIA_SOURCE_TYPES = [
  { value: 'image',        label: 'Immagine' },
  { value: 'video',        label: 'Video (upload)' },
  { value: 'audio',        label: 'Audio' },
  { value: 'file',         label: 'File generico' },
  { value: 'remote_video', label: 'Video remoto (YouTube/Vimeo)' },
] as const;
