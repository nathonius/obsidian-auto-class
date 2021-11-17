import { DEFAULT_SETTINGS } from './constants';
import { AutoClassPluginSettings } from './interfaces';
import { AutoClassPlugin } from './plugin';

export async function migrate(plugin: AutoClassPlugin): Promise<void> {
  if (plugin.settings && plugin.settings.version !== DEFAULT_SETTINGS.version) {
    // Execute migrations
    pathsToMatches(plugin.settings);

    // Update version
    plugin.settings.version = DEFAULT_SETTINGS.version;

    // Save settings
    await plugin.saveSettings();
  }
}

/**
 * Moves old settings from {paths: [...]} to {matches: [...]}
 */
function pathsToMatches(settings: AutoClassPluginSettings): void {
  if ('paths' in settings) {
    settings.matches = (settings as any).paths;
    delete (settings as any).paths;
  }
}
