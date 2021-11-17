import { ClassMatchScope } from './enum';
import { AutoClassPluginSettings } from './interfaces';

export const DEFAULT_SETTINGS: AutoClassPluginSettings = {
  paths: [{ path: 'Example Path/Subfolder/', classes: ['example-class'], scope: ClassMatchScope.Preview }],
  version: '1.5.3'
};
