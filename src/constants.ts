import { ClassPathScope } from './enum';
import { AutoClassPluginSettings } from './interfaces';

export const DEFAULT_SETTINGS: AutoClassPluginSettings = {
  paths: [{ path: 'Example Path/Subfolder/', classes: ['example-class'], scope: ClassPathScope.Preview }],
  version: '1.5.0'
};
