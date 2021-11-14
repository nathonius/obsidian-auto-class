import { ClassPath, ClassPathGroup } from './interfaces';

export function isClassPath(pathOrGroup: ClassPath | ClassPathGroup | ClassPath[]): pathOrGroup is ClassPath {
  return (pathOrGroup as ClassPath).classes && Array.isArray((pathOrGroup as ClassPath).classes);
}

export function isClassPathGroup(pathOrGroup: ClassPath | ClassPathGroup | ClassPath[]): pathOrGroup is ClassPathGroup {
  return !isClassPath(pathOrGroup);
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
