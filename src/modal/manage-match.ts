import { Modal, setIcon, TFolder } from 'obsidian';
import { ClassMatchScope } from '../enum';
import { ClassPath, ClassGroup, ClassTag } from '../interfaces';
import { className, getClassList, isClassPath } from '../util';
import { AutoClassPlugin } from '../plugin';
import { SuggestModal } from './suggest';

const c = className('auto-class-manage-match');

export class ManageMatchModal extends Modal {
  readonly suggestModal = new SuggestModal(this.app);
  classMatch: ClassPath | ClassTag | null = null;
  group: ClassGroup | null = null;
  updatedClassMatch: ClassPath | ClassTag | null = null;
  save: (original: ClassPath | ClassTag, updated: ClassPath | ClassTag, group: ClassGroup | null) => Promise<void>;

  constructor(plugin: AutoClassPlugin) {
    super(plugin.app);
    this.modalEl.addClass(c('modal'));
  }

  onOpen(): void {
    if (this.classMatch) {
      // Make a copy of the original setting
      this.updatedClassMatch = { ...this.classMatch, classes: [...this.classMatch.classes] };
      this.display();
    }
  }

  display(): void {
    const isPath = isClassPath(this.classMatch);
    this.contentEl.empty();
    this.titleEl.setText(isPath ? 'Edit path' : 'Edit tag');

    // Render path/tag field
    const matchInputContainer = this.contentEl.createDiv(c('input-container'));
    matchInputContainer.createEl('label', {
      text: isPath ? 'Target folder' : 'Target tag',
      attr: { for: c('path-input') }
    });
    const matchInputWrapper = matchInputContainer.createDiv(c('match-input-wrapper'));
    if (isPath) {
      const pathButton = matchInputWrapper.createEl('button', {
        attr: { type: 'button', 'aria-label': 'Select folder' }
      });
      setIcon(pathButton, 'folder');
      const folders: TFolder[] = this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder) as TFolder[];
      pathButton.addEventListener('click', () => {
        this.suggestModal.selectedItem = null;
        this.suggestModal.items = folders;
        this.suggestModal.callback = (folder: TFolder) => {
          matchInput.value = folder.path;
        };
        this.suggestModal.open();
      });
    } else {
      const tagButton = matchInputWrapper.createEl('button', {
        attr: { type: 'button', 'aria-label': 'Select tag' }
      });
      setIcon(tagButton, 'hashtag');
      const tags: string[] = Object.keys((this.app.metadataCache as any).getTags());
      tagButton.addEventListener('click', () => {
        this.suggestModal.selectedItem = null;
        this.suggestModal.items = tags;
        this.suggestModal.callback = (tag: string) => {
          matchInput.value = tag;
        };
        this.suggestModal.open();
      });
    }
    const matchInput = matchInputWrapper.createEl('input', {
      attr: { placeholder: 'Folder', type: 'text', id: c('path-input') }
    });
    matchInput.value = isPath ? (this.updatedClassMatch as ClassPath).path : (this.updatedClassMatch as ClassTag).tag;

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
      text: ClassMatchScope.Preview,
      attr: { value: ClassMatchScope.Preview }
    });
    if (this.updatedClassMatch.scope === ClassMatchScope.Preview) {
      previewOption.selected = true;
    }
    const editOption = scopeSelect.createEl('option', {
      text: ClassMatchScope.Edit,
      attr: { value: ClassMatchScope.Edit }
    });
    if (this.updatedClassMatch.scope === ClassMatchScope.Edit) {
      editOption.selected = true;
    }
    const bothOption = scopeSelect.createEl('option', {
      text: ClassMatchScope.Both,
      attr: { value: ClassMatchScope.Both }
    });
    if (this.updatedClassMatch.scope === ClassMatchScope.Both) {
      bothOption.selected = true;
    }
    scopeSelect.addEventListener('change', (event: Event) => {
      this.updatedClassMatch.scope = (event.target as HTMLSelectElement).value as ClassMatchScope;
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
    for (let i = 0; i < this.updatedClassMatch.classes.length; i++) {
      const classname = this.updatedClassMatch.classes[i];
      const listItem = classList.createEl('li', { cls: c('class-list-item') });
      listItem.createSpan({ text: classname });
      const deleteButton = listItem.createEl('span', {
        cls: c('class-list-control'),
        attr: { 'aria-label': 'Remove Class' }
      });
      setIcon(deleteButton, 'trash');
      deleteButton.addEventListener('click', () => {
        this.updatedClassMatch.classes.splice(i, 1);
        this.display();
      });
    }

    this.contentEl.createEl('hr');

    // Render controls
    const controlsContainer = this.contentEl.createDiv(c('controls'));
    const saveButton = controlsContainer.createEl('button', { cls: 'mod-cta', text: 'Save', attr: { type: 'button' } });
    saveButton.addEventListener('click', async () => {
      await this.save(this.classMatch, this.updatedClassMatch, this.group);
      this.close();
    });
    const cancelButton = controlsContainer.createEl('button', { text: 'Cancel', attr: { type: 'button' } });
    cancelButton.addEventListener('click', () => {
      this.close();
    });
  }

  addClasses(classes: string): void {
    this.updatedClassMatch.classes = [...getClassList(classes), ...this.updatedClassMatch.classes];
    this.display();
  }
}
