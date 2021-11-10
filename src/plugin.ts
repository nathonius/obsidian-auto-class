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

  /**
   * Layout change event handler. Removes old classes
   * and applies new classes to the active view and
   * any linked panes.
   */
  handleLayoutChange(): void {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      // Get any linked views
      let activeViews: MarkdownView[] = [activeView];
      const leafGroup = this.app.workspace.getGroupLeaves((activeView.leaf as any).group);
      if (leafGroup) {
        activeViews = leafGroup
          .map((leaf) => leaf.view)
          .filter((view) => view instanceof MarkdownView) as MarkdownView[];
      }

      // Remove and apply classes for each applicable view
      activeViews.forEach((view) => {
        this.removePreviousClasses(view);
        let matches: ClassPath[] = [];
        let container: Element;
        if (this.isPreivewMode(view)) {
          matches = this.settings.paths.filter(
            (path) =>
              (path.scope === ClassPathScope.Preview || path.scope === ClassPathScope.Both) &&
              view.file.path.startsWith(path.path)
          );
          container = this.getPreviewContainer(view);
        } else if (this.isEditMode(view)) {
          matches = this.settings.paths.filter(
            (path) =>
              (path.scope === ClassPathScope.Edit || path.scope === ClassPathScope.Both) &&
              view.file.path.startsWith(path.path)
          );
          container = this.getEditContainer(view);
        }
        const classes: string[] = matches.flatMap((match) => match.classes);
        this.applyClasses(classes, view, container);
      });
    }
  }

  /**
   * Save settings in plugin data
   */
  saveSettings(): Promise<void> {
    return this.saveData(this.settings);
  }

  /**
   * Given a string of comma separated classnames,
   * return them as an array
   */
  getClassList(classString: string): string[] {
    return classString.split(',').map((cls) => cls.trim());
  }

  /**
   * Returns true if a view is in preview mode
   */
  private isPreivewMode(view: MarkdownView): boolean {
    return (view.currentMode as any).type === 'preview';
  }

  /**
   * Returns true if a view is in edit/source mode
   */
  private isEditMode(view: MarkdownView): boolean {
    return (view.currentMode as any).type === 'source';
  }

  /**
   * Add classes to an html element and store the
   * applied classes along with a reference the view
   * they were added to for removal later.
   */
  private applyClasses(classes: string[], view: MarkdownView, container: Element): void {
    container.addClasses(classes);
    this.appliedClasses.push({ view, classes });
  }

  /**
   * Given a view, remove any extra classes this plugin
   * has applied to that view.
   */
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

  /**
   * Remove all applied classes from all views
   */
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

  /**
   * Get the element that preview classes are applied to
   */
  private getPreviewContainer(view: MarkdownView): Element {
    return view.contentEl.querySelector('.markdown-preview-view');
  }

  /**
   * Get the element that edit/source classes are applied to
   */
  private getEditContainer(view: MarkdownView): Element {
    return view.contentEl.querySelector('.markdown-source-view');
  }
}
