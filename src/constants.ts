import { AutoClassPluginSettings } from './interfaces';
import { ClassMatchScope } from './enum';

export const DEFAULT_SETTINGS: AutoClassPluginSettings = {
  matches: [
    { path: 'Example Path/Subfolder/', classes: ['example-class'], scope: ClassMatchScope.Read },
    { tag: '#ExampleTag', classes: ['another-class'], scope: ClassMatchScope.Edit }
  ],
  version: '2.3.0',
  usePathGlob: false,
  writeToYAML: false,
  yamlAttribute: 'cssClass'
};
