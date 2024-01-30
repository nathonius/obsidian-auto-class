import { AutoClassPluginSettings, ClassPath, ClassTag } from './interfaces';
import { MarkdownView, Plugin, getAllTags } from 'obsidian';
import { isClassGroup, isClassPath, isClassTag, matchPathGlob } from './util';

import { AutoClassPluginSettingsTab } from './settings/settings';
import { ClassMatchScope } from './enum';
import { DEFAULT_SETTINGS } from './constants';
import { migrate } from './migrations';

export class AutoClassPlugin extends Plugin {
  appliedClasses = new WeakMap<MarkdownView, string[]>();
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
    const activeViews = this.getAllActiveViews();
    if (!activeViews) {
      return;
    }

    // Flatten groups into a single array
    const allClasses = this.settings.matches.flatMap((p) => (isClassGroup(p) ? p.members : p));

    // Remove and apply classes for each applicable view
    activeViews.forEach((view) => {
      this.removePreviousClasses(view);
      const [getContainer, scope] = this.isReadMode(view)
        ? [this.getPreviewContainer, ClassMatchScope.Read]
        : [this.getEditContainer, ClassMatchScope.Edit];

      const matches = this.getMatches(view, allClasses, scope);
      const classes: string[] = matches.flatMap((match) => match.classes);
      this.applyClasses(classes, view, getContainer(view));
    });
  }

  /**
   * Save settings in plugin data
   */
  saveSettings(): Promise<void> {
    return this.saveData(this.settings);
  }

  /**
   * Get the active markdown view and any linked panes.
   */
  private getAllActiveViews(): MarkdownView[] | null {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      // Get any linked views
      let activeViews: MarkdownView[] = [activeView];
      const leafGroup = this.app.workspace.getGroupLeaves((activeView.leaf as any).group);
      if (leafGroup && leafGroup.length > 0) {
        activeViews = leafGroup
          .map((leaf) => leaf.view)
          .filter((view) => view instanceof MarkdownView) as MarkdownView[];
      }
      return activeViews;
    }
    return null;
  }

  /**
   * Returns true if a view is in preview mode
   */
  private isReadMode(view: MarkdownView): boolean {
    return view.getMode() === 'preview';
  }

  /**
   * Returns true if a view is in edit/source mode
   */
  private isEditMode(view: MarkdownView): boolean {
    return view.getMode() === 'source';
  }

  /**
   * Given a view, a configured set of paths and tags, and the
   * scope to match to, return all paths and tags that match
   */
  private getMatches(
    view: MarkdownView,
    allClasses: Array<ClassPath | ClassTag>,
    scope: ClassMatchScope
  ): Array<ClassPath | ClassTag> {
    const fileCache = this.app.metadataCache.getFileCache(view.file);
    const viewTags = getAllTags(fileCache);
    return allClasses.filter((pathOrTag) => {
      if (pathOrTag.scope !== scope && pathOrTag.scope !== ClassMatchScope.Both) {
        return false;
      }
      if (isClassPath(pathOrTag)) {
        if (this.settings.usePathGlob === true) {
          return matchPathGlob(view.file.path, pathOrTag.path);
        } else {
          return view.file.path.startsWith(pathOrTag.path);
        }
      } else if (isClassTag(pathOrTag)) {
        return viewTags.includes(pathOrTag.tag);
      }
    });
  }

  /**
   * Add classes to an html element and store the
   * applied classes along with a reference the view
   * they were added to for removal later.
   */
  private applyClasses(classes: string[], view: MarkdownView, container: Element): void {
    this.appliedClasses.set(view, classes);
    if (!classes?.length) return;
    if (this.settings.writeToYAML)
      this.app.fileManager.processFrontMatter(view.file, (fm) => {
        fm[this.settings.yamlAttribute] = [...new Set([...classes, ...(fm[this.settings.yamlAttribute] || [])])];
        return;
      });
    container.addClasses(classes);
  }

  /**
   * Given a view, remove any extra classes this plugin
   * has applied to that view.
   */
  private removePreviousClasses(view: MarkdownView): void {
    const previewContainer = this.getPreviewContainer(view);
    const editContainer = this.getEditContainer(view);
    const classes = this.appliedClasses.get(view);
    this.appliedClasses.delete(view);
    if (!classes?.length) return;
    if (this.settings.writeToYAML)
      this.app.fileManager.processFrontMatter(view.file, (fm) => {
        const filtered = fm[this.settings.yamlAttribute]?.filter((c: string) => !classes.includes(c));
        if (filtered?.length) fm[this.settings.yamlAttribute] = filtered;
        else delete fm[this.settings.yamlAttribute];
        return;
      });
    if (classes && previewContainer) {
      previewContainer.removeClasses(classes);
    }
    if (classes && editContainer) {
      editContainer.removeClasses(classes);
    }
  }

  /**
   * Remove all applied classes from all views
   */
  private removeAllClasses() {
    const leaves = this.app.workspace.getLeavesOfType('markdown');
    leaves.forEach((leaf) => {
      const view = leaf.view;
      if (view instanceof MarkdownView) {
        const applied = this.appliedClasses.get(view);
        if (applied) {
          const previewContainer = this.getPreviewContainer(view);
          const editContainer = this.getEditContainer(view);
          if (previewContainer) {
            previewContainer.removeClasses(applied);
          }
          if (editContainer) {
            editContainer.removeClasses(applied);
          }
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
