import { Modal, setIcon, TFolder } from 'obsidian';
import { RuleScope, RuleTargetType } from '../enum';
import { AutoClassRule, AutoClassRuleGroup } from '../interfaces';
import { className, getClassList } from '../util';
import { AutoClassPlugin } from '../plugin';
import { SuggestModal } from './suggest';

const c = className('auto-class-manage-rule');

export class ManageRuleModal extends Modal {
  readonly suggestModal = new SuggestModal(this.app);
  rule: AutoClassRule | null = null;
  group: AutoClassRuleGroup | null = null;
  updatedRule: AutoClassRule | null = null;
  save: (original: AutoClassRule, updated: AutoClassRule, group: AutoClassRuleGroup | null) => Promise<void>;

  constructor(plugin: AutoClassPlugin) {
    super(plugin.app);
    this.modalEl.addClass(c('modal'));
  }

  onOpen(): void {
    if (this.rule) {
      // Make a copy of the original setting
      this.updatedRule = { ...this.rule, classes: [...this.rule.classes] };
      this.display();
    }
  }

  display(): void {
    this.contentEl.empty();
    const isPath = this.rule.targetType === RuleTargetType.Path;
    isPath ? this.renderPath() : this.renderTag();
    this.renderScopeDropdown(this.contentEl);
    this.renderClassInput(this.contentEl);
    this.renderClasses(this.contentEl);
    this.contentEl.createEl('hr');
    this.renderControls(this.contentEl);
  }

  addClasses(classes: string): void {
    this.updatedRule.classes = [...getClassList(classes), ...this.updatedRule.classes];
    this.display();
  }

  private renderPath(): void {
    this.titleEl.setText('Edit path');

    const { ruleButton, ruleInput } = this.renderRuleInput(this.contentEl, true, this.updatedRule.target);
    const folders: TFolder[] = this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder) as TFolder[];
    ruleButton.addEventListener('click', () => {
      this.suggestModal.selectedItem = null;
      this.suggestModal.items = folders;
      this.suggestModal.callback = (folder: TFolder) => {
        ruleInput.value = folder.path;
      };
      this.suggestModal.open();
    });
    ruleInput.addEventListener('change', () => {
      this.updatedRule.target = ruleInput.value;
    });
  }

  private renderTag(): void {
    this.titleEl.setText('Edit tag');

    const { ruleButton, ruleInput } = this.renderRuleInput(this.contentEl, false, this.updatedRule.target);
    const tags: string[] = Object.keys((this.app.metadataCache as any).getTags());
    ruleButton.addEventListener('click', () => {
      this.suggestModal.selectedItem = null;
      this.suggestModal.items = tags;
      this.suggestModal.callback = (tag: string) => {
        ruleInput.value = tag;
      };
      this.suggestModal.open();
    });
    ruleInput.addEventListener('change', () => {
      this.updatedRule.target = ruleInput.value;
    });
  }

  private renderRuleInput(
    parent: HTMLElement,
    isPath: boolean,
    value: string
  ): { ruleButton: HTMLButtonElement; ruleInput: HTMLInputElement } {
    const ruleInputContainer = parent.createDiv(c('input-container'));
    ruleInputContainer.createEl('label', {
      text: isPath ? 'Target folder' : 'Target tag',
      attr: { for: c('path-input') }
    });
    const ruleInputWrapper = ruleInputContainer.createDiv(c('rule-input-wrapper'));
    const ruleButton = ruleInputWrapper.createEl('button', {
      attr: {
        type: 'button',
        'aria-label': isPath ? 'Select folder' : 'Select tag',
        class: 'auto-class-manage-rule__rule-input-button'
      }
    });
    if (isPath) {
      setIcon(ruleButton, 'folder');
    } else {
      setIcon(ruleButton, 'hashtag');
    }
    const ruleInput = ruleInputWrapper.createEl('input', {
      attr: { placeholder: isPath ? 'Folder' : 'Tag', type: 'text', id: c('path-input') }
    });
    ruleInput.value = value;

    return { ruleButton, ruleInput };
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

    const readOption = scopeSelect.createEl('option', {
      text: RuleScope.Read,
      attr: { value: RuleScope.Read }
    });
    const editOption = scopeSelect.createEl('option', {
      text: RuleScope.Edit,
      attr: { value: RuleScope.Edit }
    });
    const bothOption = scopeSelect.createEl('option', {
      text: 'Read & Edit',
      attr: { value: 'Read & Edit' }
    });

    if (this.updatedRule.scope.Edit && this.updatedRule.scope.Read) {
      bothOption.selected = true;
    } else if (this.updatedRule.scope.Edit) {
      editOption.selected = true;
    } else if (this.updatedRule.scope.Read) {
      readOption.selected = true;
    }

    scopeSelect.addEventListener('change', (event: Event) => {
      const value = (event.target as HTMLSelectElement).value as RuleScope | 'Read & Edit';
      if (value === 'Read & Edit') {
        this.updatedRule.scope = { Edit: true, Read: true };
      } else {
        this.updatedRule.scope = { Edit: false, Read: false };
        this.updatedRule.scope[value] = true;
      }
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
    for (let i = 0; i < this.updatedRule.classes.length; i++) {
      const classname = this.updatedRule.classes[i];
      const listItem = classList.createEl('li', { cls: c('class-list-item') });
      listItem.createSpan({ text: classname });
      const deleteButton = listItem.createEl('span', {
        cls: c('class-list-control'),
        attr: { 'aria-label': 'Remove Class' }
      });
      setIcon(deleteButton, 'trash');
      deleteButton.addEventListener('click', () => {
        this.updatedRule.classes.splice(i, 1);
        this.display();
      });
    }
  }

  private renderControls(parent: HTMLElement): void {
    // Render controls
    const controlsContainer = parent.createDiv(c('controls'));
    const saveButton = controlsContainer.createEl('button', { cls: 'mod-cta', text: 'Save', attr: { type: 'button' } });
    saveButton.addEventListener('click', async () => {
      await this.save(this.rule, this.updatedRule, this.group);
      this.close();
    });
    const cancelButton = controlsContainer.createEl('button', { text: 'Cancel', attr: { type: 'button' } });
    cancelButton.addEventListener('click', () => {
      this.close();
    });
  }
}
