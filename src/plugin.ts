import { getAllTags, MarkdownView, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS } from './constants';
import { RuleScope, RuleTargetType } from './enum';
import { AutoClassPluginSettings, AutoClassRule } from './interfaces';
import { migrate } from './migrations';
import { AutoClassPluginSettingsTab } from './settings/settings';
import { isRuleGroup, matchPathGlob } from './util';

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
    const allRules = this.settings.rules.flatMap((r) => (isRuleGroup(r) ? r.members : r));

    // Remove and apply classes for each applicable view
    activeViews.forEach((view) => {
      this.removePreviousClasses(view);
      let matchedRules: AutoClassRule[] = [];
      let container: Element;
      if (this.isReadMode(view)) {
        matchedRules = this.getMatches(view, allRules, RuleScope.Read);
        container = this.getPreviewContainer(view);
      } else if (this.isEditMode(view)) {
        matchedRules = this.getMatches(view, allRules, RuleScope.Edit);
        container = this.getEditContainer(view);
      }
      const classes: string[] = matchedRules.flatMap((match) => match.classes);
      this.applyClasses(classes, view, container);
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
  private getMatches(view: MarkdownView, rules: AutoClassRule[], currentScope: RuleScope): AutoClassRule[] {
    const fileCache = this.app.metadataCache.getFileCache(view.file);
    const viewTags = getAllTags(fileCache);
    return rules.filter((rule) => {
      // This rule is for a different scope
      if (!rule.scope[currentScope]) {
        return false;
      }

      if (rule.targetType === RuleTargetType.Path) {
        if (this.settings.usePathGlob === true) {
          return matchPathGlob(view.file.path, rule.target);
        } else {
          return view.file.path.startsWith(rule.target);
        }
      } else if (rule.targetType === RuleTargetType.Tag) {
        return viewTags.includes(rule.target);
      }
    });
  }

  /**
   * Add classes to an html element and store the
   * applied classes along with a reference the view
   * they were added to for removal later.
   */
  private applyClasses(classes: string[], view: MarkdownView, container: Element): void {
    container.addClasses(classes);
    this.appliedClasses.set(view, classes);
  }

  /**
   * Given a view, remove any extra classes this plugin
   * has applied to that view.
   */
  private removePreviousClasses(view: MarkdownView): void {
    const previewContainer = this.getPreviewContainer(view);
    const editContainer = this.getEditContainer(view);
    const classes = this.appliedClasses.get(view);
    if (classes && previewContainer) {
      previewContainer.removeClasses(classes);
    }
    if (classes && editContainer) {
      editContainer.removeClasses(classes);
    }
    this.appliedClasses.delete(view);
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
