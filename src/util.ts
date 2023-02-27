import { ClassPath, ClassGroup, ClassTag, AutoClassRuleGroup, AutoClassRule } from './interfaces';
import { minimatch } from 'minimatch';
import { h, VNode } from 'preact';
import htm from 'htm';

// Configure preact
export const html = htm.bind(h) as (strings: TemplateStringsArray, ...values: any[]) => VNode<any>;

export function isRuleGroup(value: AutoClassRule | AutoClassRuleGroup): value is AutoClassRuleGroup {
  return 'members' in value && 'collapsed' in value;
}

/**
 * @deprecated
 */
export function isClassPath(value: ClassPath | ClassTag | ClassGroup): value is ClassPath {
  return 'path' in value;
}

/**
 * @deprecated
 */
export function isClassTag(value: ClassPath | ClassTag | ClassGroup): value is ClassTag {
  return 'tag' in value;
}

/**
 * @deprecated
 */
export function isClassGroup(value: ClassPath | ClassTag | ClassGroup): value is ClassGroup {
  return 'members' in value && 'collapsed' in value;
}

/**
 * Given a string of comma separated classnames,
 * return them as an array
 */
export function getClassList(classString: string): string[] {
  return classString.split(',').map((cls) => cls.trim());
}

/**
 * Generate a function to create classnames for a component
 */
export function className(prefix: string): (cls: string) => string {
  return (cls: string) => {
    return `${prefix}__${cls}`;
  };
}

/**
 * Match file path using globbing with minimatch
 */
export function matchPathGlob(path: string, pattern: string): boolean {
  return minimatch(path, pattern + '/*.md');
}
