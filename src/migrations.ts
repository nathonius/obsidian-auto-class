import { DEFAULT_SETTINGS } from './constants';
import { ClassPath } from './interfaces';
import { AutoClassPlugin } from './plugin';

export async function migrate(plugin: AutoClassPlugin): Promise<void> {
  if (plugin.settings && (!plugin.settings.version || plugin.settings.version !== DEFAULT_SETTINGS.version)) {
    // Execute migrations
    recordPathsToClassPath(plugin);

    // Update version
    plugin.settings.version = DEFAULT_SETTINGS.version;

    // Save settings
    await plugin.saveSettings();
  }
}

/**
 * Paths used to be stored in records
 * Now they are stored as arrays
 */
function recordPathsToClassPath(plugin: AutoClassPlugin): void {
  // Migrate record paths to array
  if (!Array.isArray(plugin.settings.paths)) {
    try {
      const oldPaths = plugin.settings.paths as Record<string, string>;
      const newPaths: ClassPath[] = [];
      Object.keys(oldPaths).forEach((key) => {
        const classes = plugin.getClassList(oldPaths[key]);
        newPaths.push({ path: key, classes });
      });
      plugin.settings.paths = newPaths;
    } catch {
      // Fallback if something goes wrong.
      plugin.settings.paths = [];
    }
  }
}
