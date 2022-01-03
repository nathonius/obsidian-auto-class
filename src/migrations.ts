import { Notice } from 'obsidian';
import { DEFAULT_SETTINGS } from './constants';
import { ClassMatchScope } from './enum';
import { AutoClassPluginSettings, ClassGroup, ClassMatch } from './interfaces';
import { AutoClassPlugin } from './plugin';
import { isClassGroup } from './util';

let anyMigration = false;

export async function migrate(plugin: AutoClassPlugin): Promise<void> {
  if (plugin.settings && plugin.settings.version !== DEFAULT_SETTINGS.version) {
    // Execute migrations
    pathsToMatches(plugin.settings);
    renameScopes(plugin.settings);

    // Update version
    plugin.settings.version = DEFAULT_SETTINGS.version;

    // Save settings
    await plugin.saveSettings();

    if (anyMigration) {
      new Notice(`Auto Class settings migrated for v${DEFAULT_SETTINGS.version}. Plugin may require an app reload.`);
    }
  }
}

/**
 * Moves old settings from {paths: [...]} to {matches: [...]}
 */
function pathsToMatches(settings: AutoClassPluginSettings): void {
  if ('paths' in settings) {
    anyMigration = true;
    settings.matches = (settings as any).paths;
    delete (settings as any).paths;
  }
}

/**
 * Renames v12 terminology "preview" mode to v13 term,
 * "read" mode
 */
function renameScopes(settings: AutoClassPluginSettings): void {
  const migrateScope = (match: ClassMatch): void => {
    if ((match.scope as string) === 'Preview') {
      match.scope = ClassMatchScope.Read;
      anyMigration = true;
    } else if ((match.scope as string) === 'Preview & Edit') {
      match.scope = ClassMatchScope.Both;
      anyMigration = true;
    }
  };

  for (let i = 0; i < settings.matches.length; i++) {
    if (isClassGroup(settings.matches[i])) {
      (settings.matches[i] as ClassGroup).members.forEach((member) => {
        migrateScope(member);
      });
    } else {
      migrateScope(settings.matches[i] as ClassMatch);
    }
  }
}
