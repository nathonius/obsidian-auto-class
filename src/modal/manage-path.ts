import { Modal, setIcon, TFolder } from 'obsidian';
import { ClassPathScope } from 'src/enum';
import { ClassPath } from 'src/interfaces';
import { AutoClassPlugin } from '../plugin';
import { FolderSuggestModal } from './folder-suggest';

export class ManagePathModal extends Modal {
  readonly folderSuggestModal = new FolderSuggestModal(this.app);
  classPath: ClassPath | null = null;
  updatedClassPath: ClassPath | null = null;
  save: (original: ClassPath, updated: ClassPath) => Promise<void>;

  constructor(private readonly plugin: AutoClassPlugin) {
    super(plugin.app);
    this.modalEl.addClass('auto-class-manage-path__modal');
  }

  onOpen(): void {
    if (this.classPath) {
      // Make a copy of the original setting
      this.updatedClassPath = { ...this.classPath, classes: [...this.classPath.classes] };
      this.display();
    }
  }

  display(): void {
    this.contentEl.empty();
    this.titleEl.setText('Edit path');

    // Render path field
    const pathInputContainer = this.contentEl.createDiv('auto-class-manage-path__input-container');
    pathInputContainer.createEl('label', {
      text: 'Target folder',
      attr: { for: 'auto-class-manage-path__path-input' }
    });
    const pathInputWrapper = pathInputContainer.createDiv('auto-class-manage-path__path-input-wrapper');
    const pathButton = pathInputWrapper.createEl('button', { attr: { type: 'button', 'aria-label': 'Select folder' } });
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
    const pathInput = pathInputWrapper.createEl('input', {
      attr: { placeholder: 'Folder', type: 'text', id: 'auto-class-manage-path__path-input' }
    });
    pathInput.value = this.updatedClassPath.path;

    // Render scope dropdown
    const scopeDropdownContainer = this.contentEl.createDiv('auto-class-manage-path__input-container');
    scopeDropdownContainer.createEl('label', {
      text: 'Class scope',
      attr: { for: 'auto-class-manage-path__scope-input' }
    });
    const scopeSelect = scopeDropdownContainer.createEl('select', {
      cls: 'dropdown',
      attr: { id: 'auto-class-manage-path__scope-input' }
    });
    const previewOption = scopeSelect.createEl('option', {
      text: ClassPathScope.Preview,
      attr: { value: ClassPathScope.Preview }
    });
    if (this.updatedClassPath.scope === ClassPathScope.Preview) {
      previewOption.selected = true;
    }
    const editOption = scopeSelect.createEl('option', {
      text: ClassPathScope.Edit,
      attr: { value: ClassPathScope.Edit }
    });
    if (this.updatedClassPath.scope === ClassPathScope.Edit) {
      editOption.selected = true;
    }
    const bothOption = scopeSelect.createEl('option', {
      text: ClassPathScope.Both,
      attr: { value: ClassPathScope.Both }
    });
    if (this.updatedClassPath.scope === ClassPathScope.Both) {
      bothOption.selected = true;
    }
    scopeSelect.addEventListener('change', (event: Event) => {
      this.updatedClassPath.scope = (event.target as HTMLSelectElement).value as ClassPathScope;
    });

    // Render class input
    const classInputContainer = this.contentEl.createDiv('auto-class-manage-path__input-container');
    classInputContainer.createEl('label', {
      text: 'New class(es)',
      attr: { for: 'auto-class-manage-path__class-input' }
    });
    const classInputWrapper = classInputContainer.createDiv('auto-class-manage-path__class-input-wrapper');
    const classInput = classInputWrapper.createEl('input', {
      attr: { placeholder: 'class1, class2', type: 'text', id: 'auto-class-manage-path__class-input' }
    });
    const addClassesButton = classInputWrapper.createEl('button', { text: 'Add' });
    addClassesButton.addEventListener('click', () => {
      if (classInput.value) {
        this.addClasses(classInput.value);
      }
    });

    // Render classes
    const classListContainer = this.contentEl.createDiv('auto-class-manage-path__class-list-container');
    classListContainer.createEl('h3', { text: 'Classes' });
    const classList = classListContainer.createEl('ul', { cls: 'auto-class-manage-path__class-list' });
    for (let i = 0; i < this.updatedClassPath.classes.length; i++) {
      const classname = this.updatedClassPath.classes[i];
      const listItem = classList.createEl('li', { cls: 'auto-class-manage-path__class-list-item' });
      listItem.createSpan({ text: classname });
      const deleteButton = listItem.createEl('span', {
        cls: 'auto-class-manage-path__class-list-control',
        attr: { 'aria-label': 'Remove Class' }
      });
      setIcon(deleteButton, 'trash');
      deleteButton.addEventListener('click', () => {
        this.updatedClassPath.classes.splice(i, 1);
        this.display();
      });
    }

    this.contentEl.createEl('hr');

    // Render controls
    const controlsContainer = this.contentEl.createDiv('auto-class-manage-path__controls');
    const saveButton = controlsContainer.createEl('button', { cls: 'mod-cta', text: 'Save', attr: { type: 'button' } });
    saveButton.addEventListener('click', async () => {
      await this.save(this.classPath, this.updatedClassPath);
      this.close();
    });
    const cancelButton = controlsContainer.createEl('button', { text: 'Cancel', attr: { type: 'button' } });
    cancelButton.addEventListener('click', () => {
      this.close();
    });
  }

  addClasses(classes: string): void {
    this.updatedClassPath.classes = [...this.plugin.getClassList(classes), ...this.updatedClassPath.classes];
    this.display();
  }
}
