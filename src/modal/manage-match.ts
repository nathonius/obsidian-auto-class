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
    this.contentEl.empty();
    const isPath = isClassPath(this.classMatch);
    isPath ? this.renderPath() : this.renderTag();
    this.renderScopeDropdown(this.contentEl);
    this.renderClassInput(this.contentEl);
    this.renderClasses(this.contentEl);
    this.contentEl.createEl('hr');
    this.renderControls(this.contentEl);
  }

  addClasses(classes: string): void {
    this.updatedClassMatch.classes = [...getClassList(classes), ...this.updatedClassMatch.classes];
    this.display();
  }

  private renderPath(): void {
    this.titleEl.setText('Edit path');

    const { matchButton, matchInput } = this.renderMatchInput(
      this.contentEl,
      true,
      (this.updatedClassMatch as ClassPath).path
    );
    const folders: TFolder[] = this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder) as TFolder[];
    matchButton.addEventListener('click', () => {
      this.suggestModal.selectedItem = null;
      this.suggestModal.items = folders;
      this.suggestModal.callback = (folder: TFolder) => {
        matchInput.value = folder.path;
      };
      this.suggestModal.open();
    });
    matchInput.addEventListener('change', () => {
      (this.updatedClassMatch as ClassPath).path = matchInput.value;
    });
  }

  private renderTag(): void {
    this.titleEl.setText('Edit tag');

    const { matchButton, matchInput } = this.renderMatchInput(
      this.contentEl,
      false,
      (this.updatedClassMatch as ClassTag).tag
    );
    const tags: string[] = Object.keys((this.app.metadataCache as any).getTags());
    matchButton.addEventListener('click', () => {
      this.suggestModal.selectedItem = null;
      this.suggestModal.items = tags;
      this.suggestModal.callback = (tag: string) => {
        matchInput.value = tag;
      };
      this.suggestModal.open();
    });
    matchInput.addEventListener('change', () => {
      (this.updatedClassMatch as ClassTag).tag = matchInput.value;
    });
  }

  private renderMatchInput(
    parent: HTMLElement,
    isPath: boolean,
    value: string
  ): { matchButton: HTMLButtonElement; matchInput: HTMLInputElement } {
    const matchInputContainer = parent.createDiv(c('input-container'));
    matchInputContainer.createEl('label', {
      text: isPath ? 'Target folder' : 'Target tag',
      attr: { for: c('path-input') }
    });
    const matchInputWrapper = matchInputContainer.createDiv(c('match-input-wrapper'));
    const matchButton = matchInputWrapper.createEl('button', {
      attr: { type: 'button', 'aria-label': isPath ? 'Select folder' : 'Select tag' }
    });
    if (isPath) {
      setIcon(matchButton, 'folder');
    } else {
      setIcon(matchButton, 'hashtag');
    }
    const matchInput = matchInputWrapper.createEl('input', {
      attr: { placeholder: isPath ? 'Folder' : 'Tag', type: 'text', id: c('path-input') }
    });
    matchInput.value = value;

    return { matchButton, matchInput };
  }

  private renderScopeDropdown(parent: HTMLElement): void {
    // Render scope dropdown
    const scopeDropdownContainer = parent.createDiv(c('input-container'));
    scopeDropdownContainer.createEl('label', {
      text: 'Class scope',
      attr: { for: c('scope-input') }
    });
    const scopeSelect = scopeDropdownContainer.createEl('select', {
      cls: 'dropdown',
      attr: { id: c('scope-input') }
    });
    const previewOption = scopeSelect.createEl('option', {
      text: ClassMatchScope.Read,
      attr: { value: ClassMatchScope.Read }
    });
    if (this.updatedClassMatch.scope === ClassMatchScope.Read) {
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
  }

  private renderClassInput(parent: HTMLElement): void {
    // Render class input
    const classInputContainer = parent.createDiv(c('input-container'));
    classInputContainer.createEl('label', {
      text: 'New class(es)',
      attr: { for: c('class-input') }
    });
    const classInputWrapper = classInputContainer.createDiv(c('class-input-wrapper'));
    const classInput = classInputWrapper.createEl('input', {
      attr: { placeholder: 'class1, class2', type: 'text', id: c('class-input') }
    });
    classInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' && classInput.value) {
        this.addClasses(classInput.value);
      }
    });
    const addClassesButton = classInputWrapper.createEl('button', { text: 'Add' });
    addClassesButton.addEventListener('click', () => {
      if (classInput.value) {
        this.addClasses(classInput.value);
      }
    });
  }

  private renderClasses(parent: HTMLElement): void {
    // Render classes
    const classListContainer = parent.createDiv(c('class-list-container'));
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
  }

  private renderControls(parent: HTMLElement): void {
    // Render controls
    const controlsContainer = parent.createDiv(c('controls'));
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
}
