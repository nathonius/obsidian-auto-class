import { ClassMatchScope } from './enum';
import { AutoClassPluginSettings } from './interfaces';

export const DEFAULT_SETTINGS: AutoClassPluginSettings = {
  matches: [
    { path: 'Example Path/Subfolder/', classes: ['example-class'], scope: ClassMatchScope.Read },
    { tag: '#ExampleTag', classes: ['another-class'], scope: ClassMatchScope.Edit }
  ],
  usePathGlob: false,
  version: '2.3.0'
};
