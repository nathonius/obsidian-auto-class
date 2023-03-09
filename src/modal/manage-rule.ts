import { Modal, TFolder } from 'obsidian';
import { RuleScope, RuleTargetType } from '../enum';
import { AutoClassRule, AutoClassRuleGroup } from '../interfaces';
import { className, getClassList, html } from '../util';
import { AutoClassPlugin } from '../plugin';
import { SuggestModal } from './suggest';
import { FunctionComponent, render } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { IconButton } from '../components/IconButton';

const c = className('auto-class-manage-rule');

export class ManageRuleModal extends Modal {
  rule: AutoClassRule | null = null;
  group: AutoClassRuleGroup | null = null;
  save: (original: AutoClassRule, updated: AutoClassRule, group: AutoClassRuleGroup | null) => Promise<void>;
  private readonly suggestModal = new SuggestModal(this.app);

  constructor(plugin: AutoClassPlugin) {
    super(plugin.app);
    this.modalEl.addClass(c('modal'));
  }

  onOpen(): void {
    this.contentEl.empty();
    render(
      html`<${ModalContent}
        rule=${this.rule}
        group=${this.group}
        save=${this.save.bind(this)}
        close=${this.close.bind(this)}
        suggestModal=${this.suggestModal}
      />`,
      this.contentEl
    );
  }
}

const ModalContent: FunctionComponent<{
  rule: AutoClassRule | null;
  group: AutoClassRuleGroup | null;
  save: (original: AutoClassRule, updated: AutoClassRule, group: AutoClassRuleGroup | null) => Promise<void>;
  close: () => void;
  suggestModal: SuggestModal;
}> = (props) => {
  const { rule, group, save, suggestModal, close } = props;
  const [updatedRule, setUpdatedRule] = useState<AutoClassRule>(rule);
  const scopeValue = useMemo(() => {
    if (updatedRule.scope.Edit && updatedRule.scope.Read) {
      return 'Read & Edit';
    } else if (updatedRule.scope.Edit) {
      return RuleScope.Edit;
    } else if (updatedRule.scope.Read) {
      return RuleScope.Read;
    }
  }, [updatedRule]);
  const [classValue, setClassValue] = useState<string>();
  const isPath = useMemo(() => rule.targetType === RuleTargetType.Path, [rule]);

  const addClasses = useCallback(
    (classes: string) => {
      const newRule = { ...updatedRule };
      newRule.classes = [...getClassList(classes), ...newRule.classes];
      setUpdatedRule(newRule);
      setClassValue('');
    },
    [updatedRule]
  );

  const handleInputChange = useCallback((event: KeyboardEvent) => {
    setUpdatedRule({ ...updatedRule, target: (event.target as HTMLInputElement).value });
  }, []);

  const handleRuleButton = useCallback(() => {
    suggestModal.setItems(rule.targetType);
    suggestModal.callback = (value: TFolder | string) => {
      setUpdatedRule({ ...updatedRule, target: isPath ? (value as TFolder).path : (value as string) });
    };
    suggestModal.open();
  }, [rule, suggestModal]);

  const handleScopeChange = useCallback(
    (event: KeyboardEvent) => {
      const value = (event.target as HTMLSelectElement).value as RuleScope | 'Read & Edit';
      const newRule = { ...updatedRule };
      if (value === 'Read & Edit') {
        newRule.scope = { Edit: true, Read: true };
      } else {
        newRule.scope = { Edit: false, Read: false };
        newRule.scope[value] = true;
      }
      setUpdatedRule(newRule);
    },
    [updatedRule]
  );

  const handleClassValueChange = useCallback((event: KeyboardEvent) => {
    setClassValue((event.target as HTMLInputElement).value);
  }, []);

  const handleClassValueEnter = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter' && classValue) {
        addClasses(classValue);
      }
    },
    [classValue]
  );

  const handleAddClassesButton = useCallback(() => {
    if (classValue) {
      addClasses(classValue);
    }
  }, [classValue]);

  const handleDeleteClassButton = useCallback(
    (event: MouseEvent) => {
      const index = parseInt((event.target as HTMLButtonElement).dataset.index);
      const newRule = { ...updatedRule };
      newRule.classes.splice(index, 1);
      setUpdatedRule(newRule);
    },
    [updatedRule]
  );

  const handleSaveButton = useCallback(async () => {
    await save(rule, updatedRule, group);
    close();
  }, [save, rule, updatedRule, group, close]);

  // Reset updated rule when original rule changes
  useEffect(() => {
    setUpdatedRule(rule);
  }, [rule]);

  return html`
    <div class=${c('input-container')}>
      <label for=${c('path-input')}>Target ${isPath ? 'folder' : 'tag'}</label>
      <div class=${c('rule-input-wrapper')}>
        <${IconButton}
          class=${c('rule-input-button')}
          onClick=${handleRuleButton}
          icon="${isPath ? 'folder' : 'hashtag'}"
        >
          Select ${isPath ? 'folder' : 'tag'}
        </IconButton>
        <input
          type="text"
          placeholder=${isPath ? 'Folder' : 'Tag'}
          id=${c('path-input')}
          value=${updatedRule.target}
          onChange=${handleInputChange}
        />
      </div>
    </div>
    <div class=${c('input-container')}>
      <label for=${c('scope-input')}>Class scope</label>
      <select class="dropdown" id=${c('scope-input')} value=${scopeValue} onChange=${handleScopeChange}>
        <option value=${RuleScope.Read}>Read</option>
        <option value=${RuleScope.Edit}>Edit</option>
        <option value="Read & Edit">Read & Edit</option>
      </select>
    </div>
    <div class=${c('input-container')}>
      <label for=${c('class-input')}>New class(es)</label>
      <div class=${c('class-input-wrapper')}>
        <input
          type="text"
          placeholder="class1, class2"
          id=${c('class-input')}
          value=${classValue}
          onChange=${handleClassValueChange}
          onKeyUp=${handleClassValueEnter}
        />
        <button type="button" onClick=${handleAddClassesButton}>Add</button>
      </div>
    </div>
    <div class=${c('class-list-container')}>
      <h3>Classes</h3>
      <ul class=${c('class-list')}>
        ${updatedRule.classes.map(
          (classname, index) => html`<li class=${c('class-list-item')} key="${index}">
            <span>${classname}</span>
            <${IconButton}
              class=${c('class-list-control')}
              data-index="${index}"
              onClick=${handleDeleteClassButton}
              icon="trash"
            >
              Remove Class
            </IconButton>
          </li>`
        )}
      </ul>
    </div>
    <hr />
    <div class=${c('controls')}>
      <button type="button" class="mod-cta" onClick=${handleSaveButton}>Save</button>
      <button type="button" onClick=${close}>Cancel</button>
    </div>
  `;
};
