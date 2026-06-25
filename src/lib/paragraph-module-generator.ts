import JSZip from 'jszip';
import { ParagraphType, ContentType, Field, FieldTypeKey } from './types';

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
  datetime:                     'DinamoDateAndTimeField',
  daterange:                    'DinamoDateAndTimeField',
  media_image:                  'DinamoMediaField',
  media_video:                  'DinamoMediaField',
  media_audio:                  'DinamoMediaField',
  media_document:               'DinamoMediaField',
  media:                        'DinamoMediaField',
  taxonomy:                     'DinamoTaxonomyField',
  // entity_reference is resolved dynamically in fieldToPhp based on targetType
  entity_reference_revisions:   'DinamoEntityReferenceRevisionsField',
};

const CLASS_NAMESPACE: Record<string, string> = {
  DinamoTextField:                    'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoTextField',
  DinamoLinkField:                    'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoLinkField',
  DinamoCheckboxField:                'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoCheckboxField',
  DinamoNumberField:                  'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoNumberField',
  DinamoDateAndTimeField:             'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoDateAndTimeField',
  DinamoMediaField:                   'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoMediaField',
  DinamoTaxonomyField:                'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoTaxonomyField',
  DinamoEntityReferenceRevisionsField:'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoEntityReferenceRevisionsField',
  DinamoEntityReferenceField:         'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoEntityReferenceField',
  DinamoEntityCTField:                'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoEntityCTField',
  DinamoInlineEntityReferenceField:   'Drupal\\dinamo_configurator\\Plugin\\Field\\DinamoInlineEntityReferenceField',
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

function fieldToPhp(field: Field, ownerMachineName: string, constName: string, weight: number, entityType: 'paragraph' | 'node' = 'paragraph'): string {
  const baseName = stripPrefix(field.machineName, ownerMachineName);
  const cls = CLASS_FOR_TYPE[field.type];
  const params = (parts: string[]) =>
    `  ${cls}::create(ct: ${constName}, ${parts.join(', ')}, entityType: '${entityType}', weight: ${weight});`;

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

    case 'media': {
      const bundles = (field.targetBundles ?? []).map((b) => `'${b}'`).join(', ');
      return params([`fieldName: '${baseName}'`, `bundles: [${bundles}]`, `label: '${field.label}'`]);
    }

    case 'taxonomy':
      return params([`fieldName: '${baseName}'`, `vocabulary: '${field.taxonomyVocabulary ?? ''}'`, `label: '${field.label}'`]);

    case 'entity_reference':
      if (field.targetType === 'node_type') {
        return `  DinamoEntityCTField::create(ct: ${constName}, fieldName: '${baseName}', label: '${field.label}', weight: ${weight});`;
      }
      if (field.targetType === 'node') {
        const bundle = field.targetBundles?.[0] ?? '';
        const cardinality = field.multiple ? -1 : 1;
        return `  DinamoInlineEntityReferenceField::create(ct: ${constName}, fieldName: '${baseName}', label: '${field.label}', weight: ${weight}, targetBundle: '${bundle}', cardinality: ${cardinality});`;
      }
      return `  DinamoEntityReferenceField::create(ct: ${constName}, fieldName: '${baseName}', targetType: '${field.targetType ?? ''}', label: '${field.label}', entityType: '${entityType}', weight: ${weight});`;

    case 'entity_reference_revisions': {
      const bundles = (field.targetBundles ?? []).map((b) => `'${b}' => '${b}'`).join(', ');
      const cardinality = field.multiple ? -1 : 1;
      return params([`fieldName: '${baseName}'`, `label: '${field.label}'`, `targetBundles: [${bundles}]`, `cardinality: ${cardinality}`]);
    }

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

  const usedClasses = new Set<string>(['DinamoConfigurator']);
  paragraph.fields.forEach((f) => {
    if (f.type === 'entity_reference') {
      if (f.targetType === 'node_type') usedClasses.add('DinamoEntityCTField');
      else if (f.targetType === 'node')  usedClasses.add('DinamoInlineEntityReferenceField');
      else                               usedClasses.add('DinamoEntityReferenceField');
    } else {
      const cls = CLASS_FOR_TYPE[f.type];
      if (cls) usedClasses.add(cls);
    }
  });

  const useLines = [
    `use \\Drupal\\dinamo_configurator\\DinamoConfigurator;`,
    ...[...usedClasses]
      .filter((c) => c !== 'DinamoConfigurator')
      .sort()
      .map((c) => `use \\${CLASS_NAMESPACE[c]};`),
  ].join('\n');

  const fieldLines = paragraph.fields.map((f, i) =>
    fieldToPhp(f, mn, constName, i + 1)
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

function generateInfoYmlCF(cf: ParagraphType): string {
  return [
    `name: 'Custom Field: ${cf.label}'`,
    `type: module`,
    `description: 'Custom field ${cf.label}'`,
    `package: 'Dinamo'`,
    `core_version_requirement: ^11`,
    '',
  ].join('\n');
}

function generateModuleCF(cf: ParagraphType): string {
  return `<?php\n\n/**\n * @file\n * Module file for f_${cf.machineName.replace(/-/g, '_')}.\n */\n`;
}

function generateInstallCF(cf: ParagraphType): string {
  const mn = cf.machineName.replace(/-/g, '_');
  const constName = `F_${mn.toUpperCase()}`;
  const fnPrefix = `f_${mn}`;

  const usedClasses = new Set<string>(['DinamoConfigurator']);
  cf.fields.forEach((f) => {
    if (f.type === 'entity_reference') {
      if (f.targetType === 'node_type') usedClasses.add('DinamoEntityCTField');
      else if (f.targetType === 'node')  usedClasses.add('DinamoInlineEntityReferenceField');
      else                               usedClasses.add('DinamoEntityReferenceField');
    } else {
      const cls = CLASS_FOR_TYPE[f.type];
      if (cls) usedClasses.add(cls);
    }
  });

  const useLines = [
    `use \\Drupal\\dinamo_configurator\\DinamoConfigurator;`,
    ...[...usedClasses]
      .filter((c) => c !== 'DinamoConfigurator')
      .sort()
      .map((c) => `use \\${CLASS_NAMESPACE[c]};`),
  ].join('\n');

  const fieldLines = cf.fields.map((f, i) =>
    fieldToPhp(f, cf.machineName, constName, i + 1)
  ).join('\n');

  return [
    `<?php`,
    ``,
    useLines,
    ``,
    `const ${constName} = '${cf.label}';`,
    ``,
    `/**`,
    ` * Implements hook_install().`,
    ` */`,
    `function ${fnPrefix}_install()`,
    `{`,
    `  DinamoConfigurator::createPartial(name: ${constName}, label: '${cf.label}',);`,
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

export async function downloadAllCustomFieldsModule(customFieldTypes: ParagraphType[]): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder('custom_fields')!;

  customFieldTypes.forEach((cf) => {
    const mn = cf.machineName.replace(/-/g, '_');
    const folderName = `f-${cf.machineName.replace(/_/g, '-')}`;
    const fileBase = `f_${mn}`;
    const folder = root.folder(folderName)!;
    folder.file(`${fileBase}.info.yml`, generateInfoYmlCF(cf));
    folder.file(`${fileBase}.module`,   generateModuleCF(cf));
    folder.file(`${fileBase}.install`,  generateInstallCF(cf));
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'custom_fields.zip';
  a.click();
  URL.revokeObjectURL(url);
}

function generateInfoYmlCT(ct: ContentType): string {
  return [
    `name: 'Content Type: ${ct.label}'`,
    `type: module`,
    `description: 'Content type ${ct.label}'`,
    `package: 'Dinamo'`,
    `core_version_requirement: ^11`,
    '',
  ].join('\n');
}

function generateModuleCT(ct: ContentType): string {
  return `<?php\n\n/**\n * @file\n * Module file for ct_${ct.machineName.replace(/-/g, '_')}.\n */\n`;
}

function generateInstallCT(ct: ContentType): string {
  const mn = ct.machineName.replace(/-/g, '_');
  const labelConst = `CT_${mn.toUpperCase()}`;
  const mnConst    = `CT_MACHINE_NAME_${mn.toUpperCase()}`;
  const fnPrefix   = `ct_${mn}`;

  const usedClasses = new Set<string>(['DinamoConfigurator']);
  ct.fields.forEach((f) => {
    if (f.type === 'entity_reference') {
      if (f.targetType === 'node_type') usedClasses.add('DinamoEntityCTField');
      else if (f.targetType === 'node')  usedClasses.add('DinamoInlineEntityReferenceField');
      else                               usedClasses.add('DinamoEntityReferenceField');
    } else {
      const cls = CLASS_FOR_TYPE[f.type];
      if (cls) usedClasses.add(cls);
    }
  });

  const useLines = [
    `use \\Drupal\\dinamo_configurator\\DinamoConfigurator;`,
    ...[...usedClasses]
      .filter((c) => c !== 'DinamoConfigurator')
      .sort()
      .map((c) => `use Drupal\\dinamo_configurator\\Plugin\\Field\\${c};`),
  ].join('\n');

  // group fields: collect groupFields() calls and field lines together
  const bodyLines: string[] = [];
  const emittedGroups = new Set<string>();
  let weight = 1;

  // pre-collect field names per group
  const groupMembers: Record<string, string[]> = {};
  ct.fields.forEach((f) => {
    if (f.group) {
      const baseName = stripPrefix(f.machineName, ct.machineName);
      (groupMembers[f.group] ??= []).push(baseName);
    }
  });

  ct.fields.forEach((f) => {
    const w = weight++;
    const grp = f.group;
    if (grp && !emittedGroups.has(grp)) {
      const members = (groupMembers[grp] ?? []).map((n) => `'${n}'`).join(', ');
      bodyLines.push(
        `  DinamoConfigurator::groupFields(ct: ${mnConst}, fields: [${members}], groupName: '${grp}', weight: ${w - 1 > 0 ? w - 1 : w});`
      );
      emittedGroups.add(grp);
    }
    bodyLines.push(fieldToPhp(f, ct.machineName, mnConst, w, 'node'));
  });

  return [
    `<?php`,
    ``,
    useLines,
    ``,
    `const ${labelConst} = '${ct.label}';`,
    `const ${mnConst} = '${ct.machineName}';`,
    ``,
    `/**`,
    ` * Implements hook_install().`,
    ` */`,
    `function ${fnPrefix}_install()`,
    `{`,
    `  DinamoConfigurator::createCT(name: ${labelConst}, disable_menu: true, machine_name: ${mnConst});`,
    ...bodyLines,
    `}`,
    ``,
    `/**`,
    ` * Implements hook_uninstall().`,
    ` */`,
    `function ${fnPrefix}_uninstall()`,
    `{`,
    `  DinamoConfigurator::removeCT(${mnConst});`,
    `}`,
    ``,
  ].join('\n');
}

export async function downloadAllContentTypesModule(contentTypes: ContentType[]): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder('cts')!;

  contentTypes.forEach((ct) => {
    const mn = ct.machineName.replace(/-/g, '_');
    const folderName = `ct-${ct.machineName.replace(/_/g, '-')}`;
    const fileBase = `ct_${mn}`;
    const folder = root.folder(folderName)!;
    folder.file(`${fileBase}.info.yml`, generateInfoYmlCT(ct));
    folder.file(`${fileBase}.module`,   generateModuleCT(ct));
    folder.file(`${fileBase}.install`,  generateInstallCT(ct));
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cts.zip';
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAllParagraphsModule(paragraphTypes: ParagraphType[]): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder('partials')!;

  paragraphTypes.forEach((paragraph) => {
    const mn = paragraph.machineName.replace(/-/g, '_');
    const folderName = `p-${paragraph.machineName.replace(/_/g, '-')}`;
    const fileBase = `p_${mn}`;
    const folder = root.folder(folderName)!;
    folder.file(`${fileBase}.info.yml`, generateInfoYml(paragraph));
    folder.file(`${fileBase}.module`,   generateModule(paragraph));
    folder.file(`${fileBase}.install`,  generateInstall(paragraph));
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'partials.zip';
  a.click();
  URL.revokeObjectURL(url);
}

function generateInfoYmlLoader(loader: ParagraphType): string {
  return [
    `name: 'Loader: ${loader.label}'`,
    `type: module`,
    `description: 'Loader ${loader.label}'`,
    `package: 'Dinamo'`,
    `core_version_requirement: ^11`,
    '',
  ].join('\n');
}

function generateModuleLoader(loader: ParagraphType): string {
  return `<?php\n\n/**\n * @file\n * Module file for l_${loader.machineName.replace(/-/g, '_')}.\n */\n`;
}

function generateInstallLoader(loader: ParagraphType): string {
  const mn = loader.machineName.replace(/-/g, '_');
  const constName = `L_${mn.toUpperCase()}`;
  const fnPrefix = `l_${mn}`;

  const usedClasses = new Set<string>(['DinamoConfigurator']);
  loader.fields.forEach((f) => {
    if (f.type === 'entity_reference') {
      if (f.targetType === 'node_type') usedClasses.add('DinamoEntityCTField');
      else if (f.targetType === 'node')  usedClasses.add('DinamoInlineEntityReferenceField');
      else                               usedClasses.add('DinamoEntityReferenceField');
    } else {
      const cls = CLASS_FOR_TYPE[f.type];
      if (cls) usedClasses.add(cls);
    }
  });

  const useLines = [
    `use \\Drupal\\dinamo_configurator\\DinamoConfigurator;`,
    ...[...usedClasses]
      .filter((c) => c !== 'DinamoConfigurator')
      .sort()
      .map((c) => `use \\${CLASS_NAMESPACE[c]};`),
  ].join('\n');

  const fieldLines = loader.fields.map((f, i) =>
    fieldToPhp(f, loader.machineName, constName, i + 1)
  ).join('\n');

  return [
    `<?php`,
    ``,
    useLines,
    ``,
    `const ${constName} = '${loader.label}';`,
    ``,
    `/**`,
    ` * Implements hook_install().`,
    ` */`,
    `function ${fnPrefix}_install()`,
    `{`,
    `  DinamoConfigurator::createLoader(name: ${constName}, label: '${loader.label}',);`,
    fieldLines,
    `}`,
    ``,
    `/**`,
    ` * Implements hook_uninstall().`,
    ` */`,
    `function ${fnPrefix}_uninstall()`,
    `{`,
    `  DinamoConfigurator::removeLoader(${constName});`,
    `}`,
    ``,
  ].join('\n');
}

export async function downloadAllLoadersModule(loaderTypes: ParagraphType[]): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder('loaders')!;

  loaderTypes.forEach((loader) => {
    const mn = loader.machineName.replace(/-/g, '_');
    const folderName = `l-${loader.machineName.replace(/_/g, '-')}`;
    const fileBase = `l_${mn}`;
    const folder = root.folder(folderName)!;
    folder.file(`${fileBase}.info.yml`, generateInfoYmlLoader(loader));
    folder.file(`${fileBase}.module`,   generateModuleLoader(loader));
    folder.file(`${fileBase}.install`,  generateInstallLoader(loader));
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'loaders.zip';
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadContentTypeModule(ct: ContentType): Promise<void> {
  const mn = ct.machineName.replace(/-/g, '_');
  const folderName = `ct-${ct.machineName.replace(/_/g, '-')}`;
  const fileBase = `ct_${mn}`;

  const zip = new JSZip();
  const folder = zip.folder(folderName)!;
  folder.file(`${fileBase}.info.yml`, generateInfoYmlCT(ct));
  folder.file(`${fileBase}.module`,   generateModuleCT(ct));
  folder.file(`${fileBase}.install`,  generateInstallCT(ct));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
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
