import { Modal, setIcon, TFolder } from 'obsidian';
import { ClassPathScope } from '../enum';
import { ClassPath } from '../interfaces';
import { className, getClassList } from '../util';
import { AutoClassPlugin } from '../plugin';
import { FolderSuggestModal } from './folder-suggest';

const c = className('auto-class-manage-path');

export class ManagePathModal extends Modal {
  readonly folderSuggestModal = new FolderSuggestModal(this.app);
  classPath: ClassPath | null = null;
  updatedClassPath: ClassPath | null = null;
  save: (original: ClassPath, updated: ClassPath) => Promise<void>;

  constructor(private readonly plugin: AutoClassPlugin) {
    super(plugin.app);
    this.modalEl.addClass(c('modal'));
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
    const pathInputContainer = this.contentEl.createDiv(c('input-container'));
    pathInputContainer.createEl('label', {
      text: 'Target folder',
      attr: { for: c('path-input') }
    });
    const pathInputWrapper = pathInputContainer.createDiv(c('path-input-wrapper'));
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
      attr: { placeholder: 'Folder', type: 'text', id: c('path-input') }
    });
    pathInput.value = this.updatedClassPath.path;

    // Render scope dropdown
    const scopeDropdownContainer = this.contentEl.createDiv(c('input-container'));
    scopeDropdownContainer.createEl('label', {
      text: 'Class scope',
      attr: { for: c('scope-input') }
    });
    const scopeSelect = scopeDropdownContainer.createEl('select', {
      cls: 'dropdown',
      attr: { id: c('scope-input') }
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
    const classInputContainer = this.contentEl.createDiv(c('input-container'));
    classInputContainer.createEl('label', {
      text: 'New class(es)',
      attr: { for: c('class-input') }
    });
    const classInputWrapper = classInputContainer.createDiv(c('class-input-wrapper'));
    const classInput = classInputWrapper.createEl('input', {
      attr: { placeholder: 'class1, class2', type: 'text', id: c('class-input') }
    });
    const addClassesButton = classInputWrapper.createEl('button', { text: 'Add' });
    addClassesButton.addEventListener('click', () => {
      if (classInput.value) {
        this.addClasses(classInput.value);
      }
    });

    // Render classes
    const classListContainer = this.contentEl.createDiv(c('class-list-container'));
    classListContainer.createEl('h3', { text: 'Classes' });
    const classList = classListContainer.createEl('ul', { cls: c('class-list') });
    for (let i = 0; i < this.updatedClassPath.classes.length; i++) {
      const classname = this.updatedClassPath.classes[i];
      const listItem = classList.createEl('li', { cls: c('class-list-item') });
      listItem.createSpan({ text: classname });
      const deleteButton = listItem.createEl('span', {
        cls: c('class-list-control'),
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
    const controlsContainer = this.contentEl.createDiv(c('controls'));
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
    this.updatedClassPath.classes = [...getClassList(classes), ...this.updatedClassPath.classes];
    this.display();
  }
}
