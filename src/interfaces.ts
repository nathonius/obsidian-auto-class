import { MarkdownView } from 'obsidian';
import { ClassPathScope } from './enum';

export interface AutoClassPluginSettings {
  paths: ClassPath[];
  version: string;
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
