import { MarkdownView } from 'obsidian';
import { ClassMatchScope } from './enum';

export interface AutoClassPluginSettings {
  matches: Array<ClassPath | ClassTag | ClassGroup>;
  version: string;
  usePathGlob: boolean;
}

export interface ClassGroup {
  name: string;
  members: Array<ClassPath | ClassTag>;
  collapsed: boolean;
}

export interface ClassMatch {
  classes: string[];
  scope: ClassMatchScope;
}

export interface ClassPath extends ClassMatch {
  path: string;
}

export interface ClassTag extends ClassMatch {
  tag: string;
}

export interface ViewAppliedClasses {
  view: MarkdownView;
  classes: string[];
}
