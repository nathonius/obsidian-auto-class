import { ClassPath, ClassGroup, ClassTag } from './interfaces';

export function isClassPath(value: ClassPath | ClassTag | ClassGroup): value is ClassPath {
  return 'path' in value;
}

export function isClassTag(value: ClassPath | ClassTag | ClassGroup): value is ClassTag {
  return 'class' in value;
}

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
