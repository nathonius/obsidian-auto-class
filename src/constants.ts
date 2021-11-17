import { ClassMatchScope } from './enum';
import { AutoClassPluginSettings } from './interfaces';

export const DEFAULT_SETTINGS: AutoClassPluginSettings = {
  matches: [
    { path: 'Example Path/Subfolder/', classes: ['example-class'], scope: ClassMatchScope.Preview },
    { tag: '#ExampleTag', classes: ['another-class'], scope: ClassMatchScope.Edit }
  ],
  version: '2.0.0'
};
