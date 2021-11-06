import { MarkdownView } from 'obsidian';

export interface AutoClassPluginSettings {
  paths: ClassPath[];
  version: string;
}

export interface ClassPath {
  path: string;
  classes: string[];
}

export interface ViewAppliedClasses {
  view: MarkdownView;
  classes: string[];
}
