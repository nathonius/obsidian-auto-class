import { MarkdownView } from 'obsidian';
import { ClassPathScope } from './enum';

export interface AutoClassPluginSettings {
  paths: Array<ClassPath | ClassPathGroup>;
  version: string;
}

export interface ClassPathGroup {
  name: string;
  members: ClassPath[];
  collapsed: boolean;
}

export interface ClassPath {
  path: string;
  classes: string[];
  scope: ClassPathScope;
}

export interface ViewAppliedClasses {
  view: MarkdownView;
  classes: string[];
}
