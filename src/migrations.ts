import { Notice } from 'obsidian';
import { DEFAULT_SETTINGS } from './constants';
import { RuleScope, RuleTargetType } from './enum';
import { AutoClassRule, AutoClassRuleGroup, ClassGroup, ClassPath, ClassTag, RuleScopeSetting } from './interfaces';
import { AutoClassPlugin } from './plugin';
import { isClassGroup, isClassPath, isClassTag } from './util';

export async function migrate(plugin: AutoClassPlugin): Promise<void> {
  let anyMigration = false;

  if (plugin.settings && plugin.settings.version !== DEFAULT_SETTINGS.version) {
    // Update version
    plugin.settings.version = DEFAULT_SETTINGS.version;

    // Migrate from classTag / classPath to rules
    if (plugin.settings.matches) {
      anyMigration = true;
      const rules: Array<AutoClassRuleGroup | AutoClassRule> = [];
      plugin.settings.matches.forEach((m) => {
        if (isClassGroup(m)) {
          rules.push(classGroupToRule(m));
        } else if (isClassPath(m)) {
          rules.push(classPathToRule(m));
        } else if (isClassTag(m)) {
          rules.push(classTagToRule(m));
        }
      });
      plugin.settings.rules = rules;
      delete plugin.settings.matches;
    }

    // Save settings
    await plugin.saveSettings();

    if (anyMigration) {
      new Notice(`Auto Class settings migrated for v${DEFAULT_SETTINGS.version}. Plugin may require an app reload.`);
    }
  }
}

function classGroupToRule(group: ClassGroup): AutoClassRuleGroup {
  const newGroup: AutoClassRuleGroup = {
    name: group.name,
    collapsed: group.collapsed,
    members: []
  };

  group.members.forEach((m) => {
    if (isClassPath(m)) {
      newGroup.members.push(classPathToRule(m));
    } else if (isClassTag(m)) {
      newGroup.members.push(classTagToRule(m));
    }
  });

  return newGroup;
}

function classPathToRule(match: ClassPath): AutoClassRule {
  return {
    name: match.path,
    classes: match.classes,
    scope: ruleScopeToRuleScopeSetting(match.scope),
    target: match.path,
    targetType: RuleTargetType.Path
  };
}

function classTagToRule(match: ClassTag): AutoClassRule {
  return {
    name: match.tag,
    classes: match.classes,
    scope: ruleScopeToRuleScopeSetting(match.scope),
    target: match.tag,
    targetType: RuleTargetType.Tag
  };
}

function ruleScopeToRuleScopeSetting(oldScope: RuleScope | 'Read & Edit'): Record<RuleScope, boolean> {
  const newScope: RuleScopeSetting = { [RuleScope.Edit]: false, [RuleScope.Read]: false };
  if (oldScope === 'Read & Edit') {
    newScope[RuleScope.Read] = true;
    newScope[RuleScope.Edit] = true;
  } else {
    newScope[oldScope] = true;
  }
  return newScope;
}
