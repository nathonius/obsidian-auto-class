import { RuleTargetType } from './enum';
import { AutoClassPluginSettings } from './interfaces';

export const DEFAULT_SETTINGS: AutoClassPluginSettings = {
  rules: [
    {
      name: 'Example Path Rule',
      classes: ['example-class'],
      scope: { Edit: true, Read: true },
      target: 'Example Path/Subfolder/',
      targetType: RuleTargetType.Path
    },
    {
      name: 'Example Tag Rule',
      classes: ['another-class'],
      scope: { Edit: false, Read: true },
      target: '#ExampleTag',
      targetType: RuleTargetType.Tag
    }
  ],
  usePathGlob: false,
  version: '3.0.0'
};
