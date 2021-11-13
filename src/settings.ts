import { App, PluginSettingTab, setIcon, TFolder } from 'obsidian';
import Sortable from 'sortablejs';
import { ClassPathScope } from './enum';
import { FolderSuggestModal } from './modal/folder-suggest';
import { ManagePathModal } from './modal/manage-path';
import { AutoClassPluginSettings, ClassPath } from './interfaces';
import { AutoClassPlugin } from './plugin';

export class AutoClassPluginSettingsTab extends PluginSettingTab {
  private readonly folderSuggestModal: FolderSuggestModal = new FolderSuggestModal(this.app);
  private readonly managePathModal: ManagePathModal = new ManagePathModal(this.plugin);

  constructor(readonly app: App, private readonly plugin: AutoClassPlugin) {
    super(app, plugin);
    this.managePathModal.save = this.editPath.bind(this);
  }

  display(): void {
    this.containerEl.empty();

    // Render title and description
    this.containerEl.createEl('h2', { text: 'Auto Class settings.' });

    this.containerEl.createEl('p', {
      text: 'Add a folder path and edit it to add CSS classes. Classes are added to the markdown view container in the appropriate scope (edit/source mode, preview mode, or both).'
    });

    this.renderPathInput(this.containerEl);
    this.containerEl.createEl('h3', { text: 'Paths' });
    this.renderPathList(this.containerEl, this.plugin.settings);
  }

  private renderPathInput(parent: HTMLElement): void {
    const inputContainer = parent.createDiv('auto-class-settings__input-container');
    const pathButton = inputContainer.createEl('button', { cls: 'auto-class-settings__folder-button' });
    setIcon(pathButton, 'folder');
    const folders: TFolder[] = this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder) as TFolder[];
    pathButton.addEventListener('click', () => {
      this.folderSuggestModal.selectedFolder = null;
      this.folderSuggestModal.items = folders;
      this.folderSuggestModal.callback = (folder: TFolder) => {
        pathInput.value = folder.path;
      };
      this.folderSuggestModal.open();
    });

    const pathInput = inputContainer.createEl('input', {
      attr: { placeholder: 'Folder', type: 'text' }
    });

    const addPathButton = inputContainer.createEl('button', {
      text: 'Add',
      cls: ['auto-class-settings__add-button', 'mod-cta']
    });
    addPathButton.addEventListener('click', () => {
      if (pathInput.value) {
        this.addPath({ path: pathInput.value, scope: ClassPathScope.Preview, classes: [] });
      }
    });
  }

  private renderPathList(parent: HTMLElement, settings: AutoClassPluginSettings): void {
    const list = parent.createEl('ul', { cls: 'auto-class-settings__path-list' });
    settings.paths.forEach((path) => {
      this.renderPathListItem(list, path);
    });

    // Make the list sortable
    new Sortable(list, {
      handle: '.auto-class-settings__path-list-drag-handle',
      group: 'classPaths',
      animation: 150,
      chosenClass: 'auto-class-settings__drag-target',
      dragClass: 'auto-class-settings__drag-ghost',
      onEnd: (event) => {
        this.moveClassPath(this.plugin.settings.paths, event.oldIndex, event.newIndex);
      }
    });
  }

  private renderPathListItem(list: HTMLUListElement, path: ClassPath): void {
    const listItem = list.createEl('li', { cls: 'auto-class-settings__path-list-item' });
    const scope = listItem.createSpan({
      cls: 'auto-class-settings__path-scope',
      attr: { 'aria-label': `Scope: ${path.scope}` }
    });
    switch (path.scope) {
      case ClassPathScope.Preview:
        setIcon(scope, 'lines-of-text');
        break;
      case ClassPathScope.Edit:
        setIcon(scope, 'code-glyph');
        break;
      case ClassPathScope.Both:
        setIcon(scope, 'documents');
        break;
    }
    listItem.createSpan({ text: path.path, cls: 'auto-class-settings__path-list-path' });
    const controls = listItem.createSpan({ cls: 'auto-class-settings__path-list-controls' });
    const editButton = controls.createSpan({
      cls: 'auto-class-settings__path-list-control',
      attr: { 'aria-label': 'Edit', role: 'button' }
    });
    setIcon(editButton, 'pencil');
    editButton.addEventListener('click', () => {
      this.beginEditPath(path);
    });
    const deleteButton = controls.createSpan({
      cls: 'auto-class-settings__path-list-control',
      attr: { 'aria-label': 'Delete', role: 'button' }
    });
    setIcon(deleteButton, 'trash');
    deleteButton.addEventListener('click', () => {
      this.deletePath(path);
    });
    const dragHandle = controls.createSpan({
      cls: ['auto-class-settings__path-list-control', 'auto-class-settings__path-list-drag-handle']
    });
    setIcon(dragHandle, 'three-horizontal-bars');
  }

  private async moveClassPath(paths: ClassPath[], oldIndex: number, newIndex: number): Promise<void> {
    const newPaths = [...paths];
    newPaths.splice(newIndex, 0, newPaths.splice(oldIndex, 1)[0]);
    this.plugin.settings.paths = newPaths;
    await this.plugin.saveSettings();
  }

  private beginEditPath(classPath: ClassPath): void {
    this.managePathModal.classPath = classPath;
    this.managePathModal.open();
  }

  private async deletePath(classPath: ClassPath): Promise<void> {
    this.plugin.settings.paths.remove(classPath);
    await this.plugin.saveSettings();
    this.display();
  }

  private async addPath(classPath: ClassPath): Promise<void> {
    this.plugin.settings.paths.unshift(classPath);
    await this.plugin.saveSettings();
    this.display();
  }

  private async editPath(original: ClassPath, updated: ClassPath): Promise<void> {
    const originalIndex = this.plugin.settings.paths.indexOf(original);
    if (originalIndex !== -1) {
      this.plugin.settings.paths[originalIndex] = updated;
      await this.plugin.saveSettings();
      this.display();
    }
  }
}
