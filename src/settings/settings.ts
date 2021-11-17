import { App, PluginSettingTab, setIcon, TFolder } from 'obsidian';
import Sortable from 'sortablejs';
import { ClassMatchScope } from '../enum';
import { FolderSuggestModal } from '../modal/folder-suggest';
import { ManageMatchModal } from '../modal/manage-match';
import { AutoClassPluginSettings, ClassPath, ClassGroup, ClassTag } from '../interfaces';
import { AutoClassPlugin } from '../plugin';
import { ConfirmModal } from '../modal/confirm';
import { EditNameModal } from '../modal/edit-name';
import { className, isClassGroup, isClassPath } from '../util';

const c = className('auto-class-settings');

export class AutoClassPluginSettingsTab extends PluginSettingTab {
  private readonly folderSuggestModal: FolderSuggestModal = new FolderSuggestModal(this.app);
  private readonly managePathModal: ManageMatchModal = new ManageMatchModal(this.plugin);
  private readonly confirmModal: ConfirmModal = new ConfirmModal(this.app);
  private readonly editNameModal: EditNameModal = new EditNameModal(this.app);

  constructor(readonly app: App, private readonly plugin: AutoClassPlugin) {
    super(app, plugin);
    this.managePathModal.save = this.editMatch.bind(this);
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
    this.renderGroupInput(this.containerEl);
    this.containerEl.createEl('h3', { text: 'Paths & Tags' });
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
        this.addMatch({ path: pathInput.value, scope: ClassMatchScope.Preview, classes: [] });
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
    const list = parent.createEl('ul', { cls: c('match-list'), attr: { 'data-index': -1 } });
    const sortableLists = [list];
    settings.paths.forEach((match, index) => {
      if (isClassGroup(match)) {
        sortableLists.push(this.renderMatchListGroup(list, match, index));
      } else if (isClassPath(match)) {
        this.renderMatchListItem(list, match, index);
      }
    });

    // Make the lists sortable
    sortableLists.forEach((l, index) => {
      new Sortable(l, {
        draggable: `.${c('draggable')}`,
        handle: `.${c('match-list-drag-handle')}`,
        group: {
          name: index === 0 ? 'root' : 'group',
          put: (to, _, dragEl) => {
            const isGroup = dragEl.classList.contains(c('match-group'));
            const toName = (to.options.group as Sortable.GroupOptions).name;
            return !isGroup || (isGroup && toName === 'root');
          },
          pull: (_, __, dragEl) => {
            const isGroup = dragEl.classList.contains(c('match-group'));
            return !isGroup;
          }
        },
        animation: 150,
        chosenClass: c('drag-target'),
        dragClass: c('drag-ghost'),
        fallbackOnBody: true,
        invertSwap: true,
        onEnd: (event) => {
          this.moveClassMatch(event.from, event.to, event.oldIndex, event.newIndex);
        }
      });
    });
  }

  /**
   * Render a class path group and its members
   */
  private renderMatchListGroup(list: HTMLUListElement, group: ClassGroup, groupIndex: number): HTMLUListElement {
    const groupItem = list.createEl('li', {
      cls: [c('match-group'), c('draggable')]
    });
    const groupHeader = groupItem.createDiv({ cls: c('match-group-header') });
    const collapseButton = groupHeader.createSpan({ cls: c('match-group-collapse-button') });
    setIcon(collapseButton, group.collapsed ? 'up-chevron-glyph' : 'down-chevron-glyph');
    collapseButton.addEventListener('click', () => {
      this.toggleGroupCollapse(group, groupList, collapseButton);
    });
    groupHeader.createSpan({ text: group.name, cls: c('match-group-name') });
    const controls = groupHeader.createDiv();
    const editButton = controls.createSpan({
      cls: c('match-list-control'),
      attr: { 'aria-label': 'Edit Name', role: 'button' }
    });
    setIcon(editButton, 'pencil');
    editButton.addEventListener('click', () => {
      this.handleEditGroup(group);
    });
    const deleteButton = controls.createSpan({
      cls: c('match-list-control'),
      attr: { 'aria-label': 'Delete Group', role: 'button' }
    });
    setIcon(deleteButton, 'trash');
    deleteButton.addEventListener('click', () => {
      this.handleDeleteGroup(group);
    });
    const dragHandle = controls.createSpan({
      cls: [c('match-list-control'), c('match-list-drag-handle')]
    });
    setIcon(dragHandle, 'three-horizontal-bars');
    const groupList = groupItem.createEl('ul', {
      cls: c('match-group-list'),
      attr: { 'data-index': groupIndex }
    });
    if (group.collapsed) {
      groupList.addClass('collapsed');
    }
    group.members.forEach((groupPath, index) => {
      this.renderMatchListItem(groupList, groupPath, index, group);
    });
    return groupList;
  }

  /**
   * Render a path in the main list or in a group
   */
  private renderMatchListItem(
    list: HTMLUListElement,
    match: ClassPath | ClassTag,
    index: number,
    group: ClassGroup | null = null
  ): void {
    // TODO: Handle tags
    if (isClassPath(match)) {
      const listItem = list.createEl('li', {
        cls: [c('match-list-item'), c('draggable')],
        attr: { 'data-index': index }
      });
      const scope = listItem.createSpan({
        cls: c('match-scope'),
        attr: { 'aria-label': `Scope: ${match.scope}` }
      });
      this.setScopeIcon(match.scope, scope);

      listItem.createSpan({ text: match.path, cls: c('match-list-path') });
      const controls = listItem.createSpan({ cls: c('match-list-controls') });
      const editButton = controls.createSpan({
        cls: c('match-list-control'),
        attr: { 'aria-label': 'Edit', role: 'button' }
      });
      setIcon(editButton, 'pencil');
      editButton.addEventListener('click', () => {
        this.beginEditPath(match, group);
      });
      const deleteButton = controls.createSpan({
        cls: c('match-list-control'),
        attr: { 'aria-label': 'Delete', role: 'button' }
      });
      setIcon(deleteButton, 'trash');
      deleteButton.addEventListener('click', () => {
        this.deleteMatch(match);
      });
      const dragHandle = controls.createSpan({
        cls: [c('match-list-control'), c('match-list-drag-handle')]
      });
      setIcon(dragHandle, 'three-horizontal-bars');
    }
  }

  /**
   * Called when dropping a dragged match or match group.
   * Saves the new location of the dragged item.
   */
  private async moveClassMatch(from: HTMLElement, to: HTMLElement, oldIndex: number, newIndex: number): Promise<void> {
    const fromIndex = parseInt(from.getAttribute('data-index'));
    const toIndex = parseInt(to.getAttribute('data-index'));
    const fromList =
      fromIndex !== -1 ? (this.plugin.settings.paths[fromIndex] as ClassGroup) : this.plugin.settings.paths;
    let toList: ClassGroup | (ClassPath | ClassTag | ClassGroup)[];
    if (fromIndex === toIndex) {
      toList = fromList;
    } else if (toIndex !== -1) {
      toList = this.plugin.settings.paths[toIndex] as ClassGroup;
    } else {
      toList = this.plugin.settings.paths;
    }

    // Remove from old list
    const matchOrGroup = !Array.isArray(fromList)
      ? // Removing from a group
        fromList.members.splice(oldIndex, 1)
      : // Removing from the root list
        fromList.splice(oldIndex, 1);

    // Add to new list
    !Array.isArray(toList)
      ? // Adding to a group
        toList.members.splice(newIndex, 0, matchOrGroup[0] as ClassPath)
      : // Adding to the root list
        toList.splice(newIndex, 0, ...matchOrGroup);
    await this.plugin.saveSettings();
    this.display();
  }

  /**
   * Initialize and open the manage path modal
   */
  private beginEditPath(classPath: ClassPath, group: ClassGroup | null = null): void {
    this.managePathModal.classPath = classPath;
    this.managePathModal.group = group;
    this.managePathModal.open();
  }

  /**
   * Delete the given match
   */
  private async deleteMatch(classMatch: ClassPath | ClassTag): Promise<void> {
    this.plugin.settings.paths.remove(classMatch);
    await this.plugin.saveSettings();
    this.display();
  }

  /**
   * Add a new path
   */
  private async addMatch(classMatch: ClassPath | ClassTag): Promise<void> {
    this.plugin.settings.paths.unshift(classMatch);
    await this.plugin.saveSettings();
    this.display();
  }

  /**
   * Passed to the edit group modal for saving
   */
  private async editMatch(
    original: ClassPath | ClassTag,
    updated: ClassPath | ClassTag,
    group: ClassGroup | null = null
  ): Promise<void> {
    let sourceList = this.plugin.settings.paths;
    if (group !== null) {
      const sourceGroup = this.plugin.settings.paths.find((p) => p === group) as ClassGroup | undefined;
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
  private toggleGroupCollapse(group: ClassGroup, groupList: HTMLElement, collapseButton: HTMLSpanElement): void {
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
  private handleEditGroup(group: ClassGroup): void {
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
  private handleDeleteGroup(group: ClassGroup): void {
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
  private setScopeIcon(currentScope: ClassMatchScope, scopeEl: HTMLElement): void {
    switch (currentScope) {
      case ClassMatchScope.Preview:
        setIcon(scopeEl, 'lines-of-text');
        break;
      case ClassMatchScope.Edit:
        setIcon(scopeEl, 'code-glyph');
        break;
      case ClassMatchScope.Both:
        setIcon(scopeEl, 'documents');
        break;
    }
  }
}
