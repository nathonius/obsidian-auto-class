import { MarkdownView } from 'obsidian';

export interface AutoClassPluginSettings {
  paths: Record<string, string>;
}

export interface ViewAppliedClasses {
  view: MarkdownView;
  classes: string[];
}
