import { App, PluginSettingTab, setIcon, TFolder } from 'obsidian';
import Sortable from 'sortablejs';
import { ClassPathScope } from '../enum';
import { FolderSuggestModal } from '../modal/folder-suggest';
import { ManagePathModal } from '../modal/manage-path';
import { AutoClassPluginSettings, ClassPath, ClassPathGroup } from '../interfaces';
import { AutoClassPlugin } from '../plugin';
import { ConfirmModal } from '../modal/confirm';
import { EditNameModal } from '../modal/edit-name';
import { className, isClassPathGroup } from '../util';

const c = className('auto-class-settings');

export class AutoClassPluginSettingsTab extends PluginSettingTab {
  private readonly folderSuggestModal: FolderSuggestModal = new FolderSuggestModal(this.app);
  private readonly managePathModal: ManagePathModal = new ManagePathModal(this.plugin);
  private readonly confirmModal: ConfirmModal = new ConfirmModal(this.app);
  private readonly editNameModal: EditNameModal = new EditNameModal(this.app);

  constructor(readonly app: App, private readonly plugin: AutoClassPlugin) {
    super(app, plugin);
    this.managePathModal.save = this.editPath.bind(this);
    this.confirmModal.message = 'Are you sure you want to delete this group? All paths in it will also be deleted.';
  }

  display(): void {
    this.containerEl.empty();

    // Render title and description
    this.containerEl.createEl('h2', { text: 'Auto Class settings.' });

    this.containerEl.createEl('p', {
      text: 'Add a folder path and edit it to add CSS classes. Classes are added to the markdown view container in the appropriate scope (edit/source mode, preview mode, or both). Paths can be grouped for organization.'
    });

    this.renderPathInput(this.containerEl);
    this.renderGroupInput(this.containerEl);
    this.containerEl.createEl('h3', { text: 'Paths' });
    this.renderPathList(this.containerEl, this.plugin.settings);
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

    const addPathButton = inputContainer.createEl('button', {
      text: 'Add Path',
      cls: [c('add-button'), 'mod-cta']
    });
    addPathButton.addEventListener('click', () => {
      if (pathInput.value) {
        this.addPath({ path: pathInput.value, scope: ClassPathScope.Preview, classes: [] });
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

    const addGroupButton = inputContainer.createEl('button', {
      text: 'Add Group',
      cls: [c('add-button')]
    });
    addGroupButton.addEventListener('click', () => {
      this.addGroup(groupInput.value);
    });
  }

  /**
   * Render all paths and groups
   */
  private renderPathList(parent: HTMLElement, settings: AutoClassPluginSettings): void {
    const list = parent.createEl('ul', { cls: c('path-list'), attr: { 'data-index': -1 } });
    const sortableLists = [list];
    settings.paths.forEach((path, index) => {
      if (isClassPathGroup(path)) {
        sortableLists.push(this.renderPathListGroup(list, path, index));
      } else {
        this.renderPathListItem(list, path, index);
      }
    });

    // Make the lists sortable
    sortableLists.forEach((l, index) => {
      new Sortable(l, {
        draggable: `.${c('draggable')}`,
        handle: `.${c('path-list-drag-handle')}`,
        group: {
          name: index === 0 ? 'root' : 'group',
          put: (to, _, dragEl) => {
            const isGroup = dragEl.classList.contains(c('path-group'));
            const toName = (to.options.group as Sortable.GroupOptions).name;
            return !isGroup || (isGroup && toName === 'root');
          },
          pull: (_, __, dragEl) => {
            const isGroup = dragEl.classList.contains(c('path-group'));
            return !isGroup;
          }
        },
        animation: 150,
        chosenClass: c('drag-target'),
        dragClass: c('drag-ghost'),
        fallbackOnBody: true,
        invertSwap: true,
        onEnd: (event) => {
          this.moveClassPath(event.from, event.to, event.oldIndex, event.newIndex);
        }
      });
    });
  }

  /**
   * Render a class path group and its members
   */
  private renderPathListGroup(list: HTMLUListElement, group: ClassPathGroup, groupIndex: number): HTMLUListElement {
    const groupItem = list.createEl('li', {
      cls: [c('path-group'), c('draggable')]
    });
    const groupHeader = groupItem.createDiv({ cls: c('path-group-header') });
    const collapseButton = groupHeader.createSpan({ cls: c('path-group-collapse-button') });
    setIcon(collapseButton, group.collapsed ? 'up-chevron-glyph' : 'down-chevron-glyph');
    collapseButton.addEventListener('click', () => {
      this.toggleGroupCollapse(group, groupList, collapseButton);
    });
    groupHeader.createSpan({ text: group.name, cls: c('path-group-name') });
    const controls = groupHeader.createDiv();
    const editButton = controls.createSpan({
      cls: c('path-list-control'),
      attr: { 'aria-label': 'Edit Name', role: 'button' }
    });
    setIcon(editButton, 'pencil');
    editButton.addEventListener('click', () => {
      this.handleEditGroup(group);
    });
    const deleteButton = controls.createSpan({
      cls: c('path-list-control'),
      attr: { 'aria-label': 'Delete Group', role: 'button' }
    });
    setIcon(deleteButton, 'trash');
    deleteButton.addEventListener('click', () => {
      this.handleDeleteGroup(group);
    });
    const dragHandle = controls.createSpan({
      cls: [c('path-list-control'), c('path-list-drag-handle')]
    });
    setIcon(dragHandle, 'three-horizontal-bars');
    const groupList = groupItem.createEl('ul', {
      cls: c('path-group-list'),
      attr: { 'data-index': groupIndex }
    });
    if (group.collapsed) {
      groupList.addClass('collapsed');
    }
    group.members.forEach((groupPath, index) => {
      this.renderPathListItem(groupList, groupPath, index);
    });
    return groupList;
  }

  /**
   * Render a path in the main list or in a group
   */
  private renderPathListItem(list: HTMLUListElement, path: ClassPath, index: number): void {
    const listItem = list.createEl('li', {
      cls: [c('path-list-item'), c('draggable')],
      attr: { 'data-index': index }
    });
    const scope = listItem.createSpan({
      cls: c('path-scope'),
      attr: { 'aria-label': `Scope: ${path.scope}` }
    });
    this.setScopeIcon(path.scope, scope);

    listItem.createSpan({ text: path.path, cls: c('path-list-path') });
    const controls = listItem.createSpan({ cls: c('path-list-controls') });
    const editButton = controls.createSpan({
      cls: c('path-list-control'),
      attr: { 'aria-label': 'Edit', role: 'button' }
    });
    setIcon(editButton, 'pencil');
    editButton.addEventListener('click', () => {
      this.beginEditPath(path);
    });
    const deleteButton = controls.createSpan({
      cls: c('path-list-control'),
      attr: { 'aria-label': 'Delete', role: 'button' }
    });
    setIcon(deleteButton, 'trash');
    deleteButton.addEventListener('click', () => {
      this.deletePath(path);
    });
    const dragHandle = controls.createSpan({
      cls: [c('path-list-control'), c('path-list-drag-handle')]
    });
    setIcon(dragHandle, 'three-horizontal-bars');
  }

  /**
   * Called when dropping a dragged path or path group.
   * Saves the new location of the dragged item.
   */
  private async moveClassPath(from: HTMLElement, to: HTMLElement, oldIndex: number, newIndex: number): Promise<void> {
    const fromIndex = parseInt(from.getAttribute('data-index'));
    const toIndex = parseInt(to.getAttribute('data-index'));
    const fromList =
      fromIndex !== -1 ? (this.plugin.settings.paths[fromIndex] as ClassPathGroup) : this.plugin.settings.paths;
    const toList =
      fromIndex === toIndex
        ? fromList
        : toIndex !== -1
        ? (this.plugin.settings.paths[toIndex] as ClassPathGroup)
        : this.plugin.settings.paths;

    // Remove from old list
    const path = !Array.isArray(fromList) ? fromList.members.splice(oldIndex, 1) : fromList.splice(oldIndex, 1);

    // Add to new list
    !Array.isArray(toList)
      ? toList.members.splice(newIndex, 0, path[0] as ClassPath)
      : toList.splice(newIndex, 0, ...path);
    await this.plugin.saveSettings();
    this.display();
  }

  /**
   * Initialize and open the manage path modal
   */
  private beginEditPath(classPath: ClassPath): void {
    this.managePathModal.classPath = classPath;
    this.managePathModal.open();
  }

  /**
   * Delete the given path
   */
  private async deletePath(classPath: ClassPath): Promise<void> {
    this.plugin.settings.paths.remove(classPath);
    await this.plugin.saveSettings();
    this.display();
  }

  /**
   * Add a new path
   */
  private async addPath(classPath: ClassPath): Promise<void> {
    this.plugin.settings.paths.unshift(classPath);
    await this.plugin.saveSettings();
    this.display();
  }

  /**
   * Passed to the edit group modal for saving
   */
  private async editPath(original: ClassPath, updated: ClassPath): Promise<void> {
    const originalIndex = this.plugin.settings.paths.indexOf(original);
    if (originalIndex !== -1) {
      this.plugin.settings.paths[originalIndex] = updated;
      await this.plugin.saveSettings();
      this.display();
    }
  }

  /**
   * Add a new empty group
   */
  private async addGroup(name: string): Promise<void> {
    if (name) {
      this.plugin.settings.paths.unshift({ name: name, members: [], collapsed: false });
      await this.plugin.saveSettings();
      this.display();
    }
  }

  /**
   * Opens the folder select modal to populate the given input
   */
  private handleFolderButton(input: HTMLInputElement): void {
    const folders: TFolder[] = this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder) as TFolder[];
    this.folderSuggestModal.selectedFolder = null;
    this.folderSuggestModal.items = folders;
    this.folderSuggestModal.callback = (folder: TFolder) => {
      input.value = folder.path;
    };
    this.folderSuggestModal.open();
  }

  /**
   * Called on click for the group collapse icon.
   * Updates the class and saves the state.
   * DOES NOT re-render the modal, since that shouldn't
   * be necessary.
   */
  private toggleGroupCollapse(group: ClassPathGroup, groupList: HTMLElement, collapseButton: HTMLSpanElement): void {
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
  private handleEditGroup(group: ClassPathGroup): void {
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
  private handleDeleteGroup(group: ClassPathGroup): void {
    const responseCallback = (deleteGroup: boolean) => {
      if (deleteGroup) {
        this.plugin.settings.paths.remove(group);
        this.plugin.saveSettings();
        this.display();
      }
      this.confirmModal.close();
    };
    this.confirmModal.callback = responseCallback;
    this.confirmModal.open();
  }

  /**
   * Sets the correct icon on the scopeEl based on the current scope
   */
  private setScopeIcon(currentScope: ClassPathScope, scopeEl: HTMLElement): void {
    switch (currentScope) {
      case ClassPathScope.Preview:
        setIcon(scopeEl, 'lines-of-text');
        break;
      case ClassPathScope.Edit:
        setIcon(scopeEl, 'code-glyph');
        break;
      case ClassPathScope.Both:
        setIcon(scopeEl, 'documents');
        break;
    }
  }
}
