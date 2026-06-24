import JSZip from 'jszip';
import { ParagraphType, Field, FieldTypeKey } from './types';

// Classes needed per field type
const CLASS_FOR_TYPE: Partial<Record<FieldTypeKey, string>> = {
  plain_text:                   'DinamoTextField',
  plain_text_long:              'DinamoTextField',
  formatted_text_long:          'DinamoTextField',
  formatted_text_with_summary:  'DinamoTextField',
  list:                         'DinamoTextField',
  radio:                        'DinamoTextField',
  integer:                      'DinamoNumberField',
  decimal:                      'DinamoNumberField',
  float:                        'DinamoNumberField',
  boolean:                      'DinamoCheckboxField',
  custom_link:                  'DinamoLinkField',
  datetime:                     'DinamoDateField',
  daterange:                    'DinamoDateField',
  media_image:                  'DinamoMediaField',
  media_video:                  'DinamoMediaField',
  media_audio:                  'DinamoMediaField',
  media_document:               'DinamoMediaField',
  taxonomy:                     'DinamoTaxonomyField',
  entity_reference:             'DinamoEntityReferenceField',
  entity_reference_revisions:   'DinamoEntityReferenceField',
};

const CLASS_NAMESPACE: Record<string, string> = {
  DinamoTextField:           'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoTextField',
  DinamoLinkField:           'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoLinkField',
  DinamoCheckboxField:       'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoCheckboxField',
  DinamoNumberField:         'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoNumberField',
  DinamoDateField:           'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoDateField',
  DinamoMediaField:          'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoMediaField',
  DinamoTaxonomyField:       'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoTaxonomyField',
  DinamoEntityReferenceField:'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoEntityReferenceField',
};

const MEDIA_BUNDLE: Partial<Record<FieldTypeKey, string>> = {
  media_image:    'image',
  media_video:    'video',
  media_audio:    'audio',
  media_document: 'document',
};

function stripPrefix(fieldMachineName: string, paragraphMachineName: string): string {
  const prefix = `${paragraphMachineName}_`;
  return fieldMachineName.startsWith(prefix)
    ? fieldMachineName.slice(prefix.length)
    : fieldMachineName;
}

function fieldToPhp(field: Field, paragraphMachineName: string, constName: string, weight: number): string {
  const baseName = stripPrefix(field.machineName, paragraphMachineName);
  const cls = CLASS_FOR_TYPE[field.type];
  const params = (parts: string[]) =>
    `  ${cls}::create(ct: ${constName}, ${parts.join(', ')}, entityType: 'paragraph', weight: ${weight});`;

  switch (field.type) {
    case 'plain_text':
    case 'plain_text_long':
    case 'formatted_text_long':
    case 'formatted_text_with_summary':
    case 'list':
    case 'radio':
      return params([`fieldName: '${baseName}'`, `fieldType: '${field.type}'`, `label: '${field.label}'`]);

    case 'custom_link':
      return params([`fieldName: '${baseName}'`, `label: '${field.label}'`]);

    case 'boolean':
      return params([`fieldName: '${baseName}'`, `label: '${field.label}'`]);

    case 'integer':
    case 'decimal':
    case 'float':
      return params([`fieldName: '${baseName}'`, `fieldType: '${field.type}'`, `label: '${field.label}'`]);

    case 'datetime':
    case 'daterange':
      return params([`fieldName: '${baseName}'`, `fieldType: '${field.type}'`, `label: '${field.label}'`]);

    case 'media_image':
    case 'media_video':
    case 'media_audio':
    case 'media_document':
      return params([`fieldName: '${baseName}'`, `bundle: '${MEDIA_BUNDLE[field.type]}'`, `label: '${field.label}'`]);

    case 'taxonomy':
      return params([`fieldName: '${baseName}'`, `vocabulary: '${field.taxonomyVocabulary ?? ''}'`, `label: '${field.label}'`]);

    case 'entity_reference':
    case 'entity_reference_revisions':
      return params([`fieldName: '${baseName}'`, `targetType: '${field.targetType ?? ''}'`, `label: '${field.label}'`]);

    default:
      return `  // TODO: ${field.label} (${field.type})`;
  }
}

function generateInfoYml(paragraph: ParagraphType): string {
  return [
    `name: 'Partial: ${paragraph.label} partial'`,
    `type: module`,
    `description: 'A partial for displaying ${paragraph.label}'`,
    `package: 'Dinamo'`,
    `core_version_requirement: ^11`,
    '',
  ].join('\n');
}

function generateModule(paragraph: ParagraphType): string {
  return `<?php\n\n/**\n * @file\n * Module file for p_${paragraph.machineName}.\n */\n`;
}

function generateInstall(paragraph: ParagraphType): string {
  const mn = paragraph.machineName;
  const constName = `P_${mn.toUpperCase().replace(/-/g, '_')}`;
  const fnPrefix = `p_${mn.replace(/-/g, '_')}`;

  // Collect which classes are actually needed
  const usedClasses = new Set<string>(['DinamoConfigurator']);
  paragraph.fields.forEach((f) => {
    const cls = CLASS_FOR_TYPE[f.type];
    if (cls) usedClasses.add(cls);
  });

  const useLines = [
    `use \\Drupal\\dinamo_configurator\\DinamoConfigurator;`,
    ...[...usedClasses]
      .filter((c) => c !== 'DinamoConfigurator')
      .sort()
      .map((c) => `use \\${CLASS_NAMESPACE[c]};`),
  ].join('\n');

  const fieldLines = paragraph.fields.map((f, i) =>
    fieldToPhp(f, mn, constName, (i + 1) * 1)
  ).join('\n');

  return [
    `<?php`,
    ``,
    useLines,
    ``,
    `const ${constName} = '${paragraph.label}';`,
    ``,
    `/**`,
    ` * Implements hook_install().`,
    ` */`,
    `function ${fnPrefix}_install()`,
    `{`,
    `  DinamoConfigurator::createPartial(name: ${constName}, label: '${paragraph.label}',);`,
    fieldLines,
    ``,
    `  try {`,
    `    Drupal\\Core\\Entity\\Entity\\EntityFormDisplay::load('paragraph.' . DinamoConfigurator::sanitize(${constName}) . '.default')->setComponent('status', [TRUE])->save();`,
    `  } catch (Exception $e) {`,
    `    \\Drupal::logger('${fnPrefix}')->notice('Error: ' . $e->getMessage());`,
    `  }`,
    `}`,
    ``,
    `/**`,
    ` * Implements hook_uninstall().`,
    ` */`,
    `function ${fnPrefix}_uninstall()`,
    `{`,
    `  DinamoConfigurator::removePartial(${constName});`,
    `}`,
    ``,
  ].join('\n');
}

export async function downloadParagraphModule(paragraph: ParagraphType): Promise<void> {
  const mn = paragraph.machineName.replace(/-/g, '_');
  const folderName = `p-${paragraph.machineName}`;
  const fileBase = `p_${mn}`;

  const zip = new JSZip();
  const folder = zip.folder(folderName)!;
  folder.file(`${fileBase}.info.yml`, generateInfoYml(paragraph));
  folder.file(`${fileBase}.module`,   generateModule(paragraph));
  folder.file(`${fileBase}.install`,  generateInstall(paragraph));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
