import { MarkdownView, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS } from './constants';
import { AutoClassPluginSettings } from './interfaces';
import { AutoClassPluginSettingsTab } from './settings';

interface ViewAppliedClasses {
  view: MarkdownView;
  classes: string[];
}

export class AutoClassPlugin extends Plugin {
  appliedClasses: ViewAppliedClasses[] = [];
  settings: AutoClassPluginSettings = DEFAULT_SETTINGS;
  async onload() {
    const savedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);

    this.addSettingTab(new AutoClassPluginSettingsTab(this.app, this));
    this.registerEvent(this.app.workspace.on('layout-change', this.handleLayoutChange.bind(this)));
  }

  onunload() {
    // pass
  }

  handleLayoutChange(): void {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView && this.isPreivewMode(activeView)) {
      this.removePreviousClasses(activeView);
      const paths = Object.keys(this.settings.paths);
      const matches: string[] = paths.filter((path) => activeView.file.path.startsWith(path));
      const classes: string[] = matches.flatMap((match) =>
        this.settings.paths[match].split(',').map((cls) => cls.trim())
      );
      this.applyPreviewClasses(classes, activeView);
      this.appliedClasses.push({ view: activeView, classes });
    }
  }

  saveSettings(): Promise<void> {
    return this.saveData(this.settings);
  }

  private isPreivewMode(view: MarkdownView): boolean {
    return (view.currentMode as any).type === 'preview';
  }

  private applyPreviewClasses(classes: string[], view: MarkdownView) {
    const container = view.contentEl.querySelector('.markdown-preview-view');
    if (container) {
      container.addClasses(classes);
    }
  }

  private removePreviousClasses(view: MarkdownView) {
    const container = view.contentEl.querySelector('.markdown-preview-view');
    if (container) {
      const newApplied: ViewAppliedClasses[] = [];
      this.appliedClasses.forEach((applied) => {
        if (applied.view !== view) {
          newApplied.push(applied);
        } else {
          container.removeClasses(applied.classes);
        }
      });
      this.appliedClasses = newApplied;
    }
  }
}
