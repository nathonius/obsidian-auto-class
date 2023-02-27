import { App, PluginSettingTab, setIcon, TFolder, Setting } from 'obsidian';
import Sortable from 'sortablejs';
import { RuleTargetType } from '../enum';
import { SuggestModal } from '../modal/suggest';
import { ManageRuleModal } from '../modal/manage-rule';
import { AutoClassPluginSettings, AutoClassRule, AutoClassRuleGroup, RuleScopeSetting } from '../interfaces';
import { AutoClassPlugin } from '../plugin';
import { ConfirmModal } from '../modal/confirm';
import { EditNameModal } from '../modal/edit-name';
import { className, isRuleGroup } from '../util';

const c = className('auto-class-settings');

export class AutoClassPluginSettingsTab extends PluginSettingTab {
  private readonly folderSuggestModal: SuggestModal = new SuggestModal(this.app);
  private readonly manageRuleModal: ManageRuleModal = new ManageRuleModal(this.plugin);
  private readonly confirmModal: ConfirmModal = new ConfirmModal(this.app);
  private readonly editNameModal: EditNameModal = new EditNameModal(this.app);

  constructor(readonly app: App, private readonly plugin: AutoClassPlugin) {
    super(app, plugin);
    this.manageRuleModal.save = this.editRule.bind(this);
    this.confirmModal.message =
      'Are you sure you want to delete this group? All configured paths and tags in it will also be deleted.';
  }

  display(): void {
    this.containerEl.empty();

    // Render title and description
    this.containerEl.createEl('h2', { text: 'Auto Class settings.' });

    this.containerEl.createEl('p', {
      text: 'Add a folder path or tag and edit it to add CSS classes. Classes are added to the markdown view container in the appropriate scope (edit/source mode, preview mode, or both). Paths and tags can be grouped for organization.'
    });

    this.renderPathInput(this.containerEl);
    this.renderTagInput(this.containerEl);
    this.renderGroupInput(this.containerEl);
    this.containerEl.createEl('h3', { text: 'Paths & Tags' });
    this.renderPathList(this.containerEl, this.plugin.settings);
    this.containerEl.createEl('h3', { text: 'Advanced' });
    this.renderGlobToggle(this.containerEl);
  }

  /**
   * Render input and buttons for new paths
   */
  private renderPathInput(parent: HTMLElement): void {
    const inputContainer = parent.createDiv({ cls: c('input-container') });
    const pathButton = inputContainer.createEl('button', { cls: c('folder-button') });
    setIcon(pathButton, 'folder');
    pathButton.addEventListener('click', () => this.handleFolderButton(pathInput));

    const pathInput = inputContainer.createEl('input', {
      attr: { placeholder: 'Folder', type: 'text' }
    });
    pathInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' && pathInput.value) {
        this.addRule({
          name: pathInput.value,
          target: pathInput.value,
          targetType: RuleTargetType.Path,
          scope: { Read: true, Edit: false },
          classes: []
        });
      }
    });

    const addPathButton = inputContainer.createEl('button', {
      text: 'Add Path',
      cls: [c('add-button'), 'mod-cta']
    });
    addPathButton.addEventListener('click', () => {
      if (pathInput.value) {
        this.addRule({
          name: pathInput.value,
          target: pathInput.value,
          targetType: RuleTargetType.Path,
          scope: { Read: true, Edit: false },
          classes: []
        });
      }
    });
  }

  private renderTagInput(parent: HTMLElement): void {
    const inputContainer = parent.createDiv({ cls: c('input-container') });
    const tagButton = inputContainer.createEl('button', { cls: c('path-button') });
    setIcon(tagButton, 'hashtag');
    tagButton.addEventListener('click', () => this.handleTagButton(tagInput));

    const tagInput = inputContainer.createEl('input', {
      attr: { placeholder: '#Tag', type: 'text' }
    });
    tagInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' && tagInput.value) {
        this.addRule({
          name: tagInput.value,
          target: tagInput.value,
          targetType: RuleTargetType.Tag,
          scope: { Read: true, Edit: false },
          classes: []
        });
      }
    });

    const addTagButton = inputContainer.createEl('button', {
      text: 'Add Tag',
      cls: [c('add-button'), 'mod-cta']
    });
    addTagButton.addEventListener('click', () => {
      if (tagInput.value) {
        this.addRule({
          name: tagInput.value,
          target: tagInput.value,
          targetType: RuleTargetType.Tag,
          scope: { Read: true, Edit: false },
          classes: []
        });
      }
    });
  }

  /**
   * Render input and button for new groups
   */
  private renderGroupInput(parent: HTMLElement): void {
    const inputContainer = parent.createDiv(c('input-container'));

    const groupInput = inputContainer.createEl('input', {
      attr: { placeholder: 'Group name', type: 'text' }
    });
    groupInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' && groupInput.value) {
        this.addGroup(groupInput.value);
      }
    });

    const addGroupButton = inputContainer.createEl('button', {
      text: 'Add Group',
      cls: [c('add-button')]
    });
    addGroupButton.addEventListener('click', () => {
      this.addGroup(groupInput.value);
    });
  }

  /**
   * Render the toggle for whether to match paths using globbing
   */
  private renderGlobToggle(parent: HTMLElement): void {
    const toggleContainer = parent.createDiv(c('toggle-container'));
    const settingName = 'Match folder paths using glob syntax';
    const settingDescriptionText =
      'To also match subfolders, add <code>/**</code> to the end of the path, e.g. <code>example/**</code> to match <code>example/subfolder</code>. <br> <strong>Windows users:</strong> Use forward slash <code>/</code> only as path separators.';
    const settingDescriptionSpan = document.createElement('span');
    const settingDescription = new DocumentFragment();

    settingDescriptionSpan.innerHTML = settingDescriptionText;
    settingDescription.append(settingDescriptionSpan);

    new Setting(toggleContainer)
      .setName(settingName)
      .setDesc(settingDescription)
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.usePathGlob).onChange(async (value) => {
          this.plugin.settings.usePathGlob = value;
          await this.plugin.saveSettings();
        });
      });
  }

  /**
   * Render all paths and groups
   */
  private renderPathList(parent: HTMLElement, settings: AutoClassPluginSettings): void {
    const list = parent.createEl('ul', { cls: c('rule-list'), attr: { 'data-index': -1 } });
    const sortableLists = [list];
    settings.rules.forEach((rule, index) => {
      if (isRuleGroup(rule)) {
        sortableLists.push(this.renderRuleListGroup(list, rule, index));
      } else {
        this.renderRuleListItem(list, rule, index);
      }
    });

    // Make the lists sortable
    sortableLists.forEach((l, index) => {
      new Sortable(l, {
        draggable: `.${c('draggable')}`,
        handle: `.${c('rule-list-drag-handle')}`,
        group: {
          name: index === 0 ? 'root' : 'group',
          put: (to, _, dragEl) => {
            const isGroup = dragEl.classList.contains(c('rule-group'));
            const toName = (to.options.group as Sortable.GroupOptions).name;
            return !isGroup || (isGroup && toName === 'root');
          },
          pull: (_, __, dragEl) => {
            const isGroup = dragEl.classList.contains(c('rule-group'));
            return !isGroup;
          }
        },
        animation: 150,
        chosenClass: c('drag-target'),
        dragClass: c('drag-ghost'),
        fallbackOnBody: true,
        invertSwap: true,
        onEnd: (event) => {
          this.moveRule(event.from, event.to, event.oldIndex, event.newIndex);
        }
      });
    });
  }

  /**
   * Render a class path group and its members
   */
  private renderRuleListGroup(list: HTMLUListElement, group: AutoClassRuleGroup, groupIndex: number): HTMLUListElement {
    const groupItem = list.createEl('li', {
      cls: [c('rule-group'), c('draggable')]
    });
    const groupHeader = groupItem.createDiv({ cls: c('rule-group-header') });
    const collapseButton = groupHeader.createSpan({ cls: c('rule-group-collapse-button') });
    setIcon(collapseButton, group.collapsed ? 'up-chevron-glyph' : 'down-chevron-glyph');
    collapseButton.addEventListener('click', () => {
      this.toggleGroupCollapse(group, groupList, collapseButton);
    });
    groupHeader.createSpan({ text: group.name, cls: c('rule-group-name') });
    const controls = groupHeader.createDiv();
    const editButton = controls.createSpan({
      cls: c('rule-list-control'),
      attr: { 'aria-label': 'Edit Name', role: 'button' }
    });
    setIcon(editButton, 'pencil');
    editButton.addEventListener('click', () => {
      this.handleEditGroup(group);
    });
    const deleteButton = controls.createSpan({
      cls: c('rule-list-control'),
      attr: { 'aria-label': 'Delete Group', role: 'button' }
    });
    setIcon(deleteButton, 'trash');
    deleteButton.addEventListener('click', () => {
      this.handleDeleteGroup(group);
    });
    const dragHandle = controls.createSpan({
      cls: [c('rule-list-control'), c('rule-list-drag-handle')]
    });
    setIcon(dragHandle, 'three-horizontal-bars');
    const groupList = groupItem.createEl('ul', {
      cls: c('rule-group-list'),
      attr: { 'data-index': groupIndex }
    });
    if (group.collapsed) {
      groupList.addClass('collapsed');
    }
    group.members.forEach((groupRule, index) => {
      this.renderRuleListItem(groupList, groupRule, index, group);
    });
    return groupList;
  }

  /**
   * Render a path in the main list or in a group
   */
  private renderRuleListItem(
    list: HTMLUListElement,
    rule: AutoClassRule,
    index: number,
    group: AutoClassRuleGroup | null = null
  ): void {
    const isPath = rule.targetType === RuleTargetType.Path;
    const listItem = list.createEl('li', {
      cls: [c('rule-list-item'), c('draggable')],
      attr: { 'data-index': index }
    });
    const ruleType = listItem.createSpan({
      cls: c('rule-type'),
      attr: { 'aria-label': `Type: ${isPath ? 'Path' : 'Tag'}` }
    });
    setIcon(ruleType, isPath ? 'folder' : 'hashtag');
    const scope = listItem.createSpan({
      cls: c('rule-scope'),
      attr: { 'aria-label': `Scope: ${this.getScopeText(rule.scope)}` }
    });
    this.setScopeIcon(rule.scope, scope);

    listItem.createSpan({ text: rule.target, cls: c('rule-list-path') });
    const controls = listItem.createSpan({ cls: c('rule-list-controls') });
    const editButton = controls.createSpan({
      cls: c('rule-list-control'),
      attr: { 'aria-label': 'Edit', role: 'button' }
    });
    setIcon(editButton, 'gear');
    editButton.addEventListener('click', () => {
      this.beginEditRule(rule, group);
    });
    const deleteButton = controls.createSpan({
      cls: c('rule-list-control'),
      attr: { 'aria-label': 'Delete', role: 'button' }
    });
    setIcon(deleteButton, 'trash');
    deleteButton.addEventListener('click', () => {
      this.deleteRule(rule, group);
    });
    const dragHandle = controls.createSpan({
      cls: [c('rule-list-control'), c('rule-list-drag-handle')]
    });
    setIcon(dragHandle, 'three-horizontal-bars');
  }

  /**
   * Called when dropping a dragged rule or rule group.
   * Saves the new location of the dragged item.
   */
  private async moveRule(from: HTMLElement, to: HTMLElement, oldIndex: number, newIndex: number): Promise<void> {
    const fromIndex = parseInt(from.getAttribute('data-index'));
    const toIndex = parseInt(to.getAttribute('data-index'));
    const fromList =
      fromIndex !== -1 ? (this.plugin.settings.rules[fromIndex] as AutoClassRuleGroup) : this.plugin.settings.rules;
    let toList: AutoClassRuleGroup | (AutoClassRule | AutoClassRuleGroup)[];
    if (fromIndex === toIndex) {
      toList = fromList;
    } else if (toIndex !== -1) {
      toList = this.plugin.settings.rules[toIndex] as AutoClassRuleGroup;
    } else {
      toList = this.plugin.settings.rules;
    }

    // Remove from old list
    const ruleOrGroup = !Array.isArray(fromList)
      ? // Removing from a group
        fromList.members.splice(oldIndex, 1)
      : // Removing from the root list
        fromList.splice(oldIndex, 1);

    // Add to new list
    !Array.isArray(toList)
      ? // Adding to a group
        toList.members.splice(newIndex, 0, ruleOrGroup[0] as AutoClassRule)
      : // Adding to the root list
        toList.splice(newIndex, 0, ...ruleOrGroup);
    await this.plugin.saveSettings();
    this.display();
  }

  /**
   * Initialize and open the manage rule modal
   */
  private beginEditRule(rule: AutoClassRule, group: AutoClassRuleGroup | null = null): void {
    this.manageRuleModal.rule = rule;
    this.manageRuleModal.group = group;
    this.manageRuleModal.open();
  }

  /**
   * Delete the given rule
   */
  private async deleteRule(rule: AutoClassRule, group: AutoClassRuleGroup | null = null): Promise<void> {
    if (!group) {
      this.plugin.settings.rules.remove(rule);
    } else {
      group.members.remove(rule);
    }
    await this.plugin.saveSettings();
    this.display();
  }

  /**
   * Add a new path
   */
  private async addRule(rule: AutoClassRule): Promise<void> {
    this.plugin.settings.rules.unshift(rule);
    await this.plugin.saveSettings();
    this.display();
  }

  /**
   * Passed to the edit group modal for saving
   */
  private async editRule(
    original: AutoClassRule,
    updated: AutoClassRule,
    group: AutoClassRuleGroup | null = null
  ): Promise<void> {
    let sourceList = this.plugin.settings.rules;
    if (group !== null) {
      const sourceGroup = this.plugin.settings.rules.find((p) => p === group) as AutoClassRuleGroup | undefined;
      if (sourceGroup) {
        sourceList = sourceGroup.members;
      } else {
        return;
      }
    }
    const originalIndex = sourceList.indexOf(original);
    if (originalIndex !== -1) {
      sourceList[originalIndex] = updated;
      await this.plugin.saveSettings();
      this.display();
    }
  }

  /**
   * Add a new empty group
   */
  private async addGroup(name: string): Promise<void> {
    if (name) {
      this.plugin.settings.rules.unshift({ name: name, members: [], collapsed: false });
      await this.plugin.saveSettings();
      this.display();
    }
  }

  /**
   * Opens the folder select modal to populate the given input
   */
  private handleFolderButton(input: HTMLInputElement): void {
    const folders: TFolder[] = this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder) as TFolder[];
    this.folderSuggestModal.selectedItem = null;
    this.folderSuggestModal.items = folders;
    this.folderSuggestModal.callback = (folder: TFolder) => {
      input.value = folder.path;
    };
    this.folderSuggestModal.open();
  }

  private handleTagButton(input: HTMLInputElement): void {
    const tags: string[] = Object.keys((this.app.metadataCache as any).getTags());
    this.folderSuggestModal.selectedItem = null;
    this.folderSuggestModal.items = tags;
    this.folderSuggestModal.callback = (tag: string) => {
      input.value = tag;
    };
    this.folderSuggestModal.open();
  }

  /**
   * Called on click for the group collapse icon.
   * Updates the class and saves the state.
   * DOES NOT re-render the modal, since that shouldn't
   * be necessary.
   */
  private toggleGroupCollapse(
    group: AutoClassRuleGroup,
    groupList: HTMLElement,
    collapseButton: HTMLSpanElement
  ): void {
    if (group.collapsed) {
      groupList.removeClass('collapsed');
    } else {
      groupList.addClass('collapsed');
    }
    group.collapsed = !group.collapsed;
    setIcon(collapseButton, group.collapsed ? 'up-chevron-glyph' : 'down-chevron-glyph');
    this.plugin.saveSettings();
  }

  /**
   * Open the edit name modal for the given group
   */
  private handleEditGroup(group: AutoClassRuleGroup): void {
    const editCallback = (newName: string) => {
      group.name = newName;
      this.plugin.saveSettings();
      this.display();
    };
    this.editNameModal.callback = editCallback;
    this.editNameModal.currentName = group.name;
    this.editNameModal.open();
  }

  /**
   * Confirms deletion of the given group and all of its children
   */
  private handleDeleteGroup(group: AutoClassRuleGroup): void {
    if (group.members.length === 0) {
      this.plugin.settings.rules.remove(group);
      this.plugin.saveSettings();
      this.display();
    } else {
      const responseCallback = (deleteGroup: boolean) => {
        if (deleteGroup) {
          this.plugin.settings.rules.remove(group);
          this.plugin.saveSettings();
          this.display();
        }
        this.confirmModal.close();
      };
      this.confirmModal.callback = responseCallback;
      this.confirmModal.open();
    }
  }

  /**
   * Sets the correct icon on the scopeEl based on the current scope
   */
  private setScopeIcon(currentScope: RuleScopeSetting, scopeEl: HTMLElement): void {
    if (currentScope.Edit && currentScope.Read) {
      setIcon(scopeEl, 'documents');
    } else if (currentScope.Edit) {
      setIcon(scopeEl, 'pencil');
    } else if (currentScope.Read) {
      setIcon(scopeEl, 'reading-glasses');
    }
  }

  private getScopeText(scope: RuleScopeSetting): string {
    const enabledScopes = Object.keys(scope).filter((key: keyof RuleScopeSetting) => {
      return scope[key] === true;
    });
    return enabledScopes.join(', ');
  }
}
