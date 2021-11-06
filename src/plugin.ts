import { MarkdownView, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS } from './constants';
import { ClassPathScope } from './enum';
import { AutoClassPluginSettings, ClassPath, ViewAppliedClasses } from './interfaces';
import { migrate } from './migrations';
import { AutoClassPluginSettingsTab } from './settings';

export class AutoClassPlugin extends Plugin {
  appliedClasses: ViewAppliedClasses[] = [];
  settings: AutoClassPluginSettings = DEFAULT_SETTINGS;
  async onload() {
    const savedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
    await migrate(this);

    this.addSettingTab(new AutoClassPluginSettingsTab(this.app, this));
    this.registerEvent(this.app.workspace.on('layout-change', this.handleLayoutChange.bind(this)));
  }

  onunload() {
    this.removeAllClasses();
  }

  handleLayoutChange(): void {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      console.log('REMOVING PREVIOUS');
      this.removePreviousClasses(activeView);
      let matches: ClassPath[] = [];
      let container: Element;
      if (this.isPreivewMode(activeView)) {
        console.log('IS PREVIEW MODE');
        matches = this.settings.paths.filter(
          (path) =>
            (path.scope === ClassPathScope.Preview || path.scope === ClassPathScope.Both) &&
            activeView.file.path.startsWith(path.path)
        );
        container = this.getPreviewContainer(activeView);
      } else if (this.isEditMode(activeView)) {
        console.log('IS EDIT MODE');
        matches = this.settings.paths.filter(
          (path) =>
            (path.scope === ClassPathScope.Edit || path.scope === ClassPathScope.Both) &&
            activeView.file.path.startsWith(path.path)
        );
        container = this.getEditContainer(activeView);
      }
      console.log(matches);
      console.log(container);
      const classes: string[] = matches.flatMap((match) => match.classes);
      console.log(classes);
      this.applyClasses(classes, activeView, container);
    }
  }

  saveSettings(): Promise<void> {
    return this.saveData(this.settings);
  }

  getClassList(classString: string): string[] {
    return classString.split(',').map((cls) => cls.trim());
  }

  private isPreivewMode(view: MarkdownView): boolean {
    return (view.currentMode as any).type === 'preview';
  }

  private isEditMode(view: MarkdownView): boolean {
    return (view.currentMode as any).type === 'source';
  }

  private applyClasses(classes: string[], view: MarkdownView, container: Element): void {
    container.addClasses(classes);
    this.appliedClasses.push({ view, classes });
  }

  private removePreviousClasses(view: MarkdownView): void {
    const previewContainer = this.getPreviewContainer(view);
    const editContainer = this.getEditContainer(view);
    const newApplied: ViewAppliedClasses[] = [];
    this.appliedClasses.forEach((applied) => {
      if (applied.view !== view) {
        newApplied.push(applied);
      } else {
        if (previewContainer) {
          previewContainer.removeClasses(applied.classes);
        }
        if (editContainer) {
          editContainer.removeClasses(applied.classes);
        }
      }
    });
    this.appliedClasses = newApplied;
  }

  private removeAllClasses() {
    this.appliedClasses.forEach((applied) => {
      if (applied.view) {
        const previewContainer = this.getPreviewContainer(applied.view);
        const editContainer = this.getEditContainer(applied.view);
        if (previewContainer) {
          previewContainer.removeClasses(applied.classes);
        }
        if (editContainer) {
          editContainer.removeClasses(applied.classes);
        }
      }
    });
  }

  private getPreviewContainer(view: MarkdownView): Element {
    return view.contentEl.querySelector('.markdown-preview-view');
  }

  private getEditContainer(view: MarkdownView): Element {
    return view.contentEl.querySelector('.markdown-source-view');
  }
}
