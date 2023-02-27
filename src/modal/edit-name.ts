import { Modal } from 'obsidian';
import { FunctionComponent, render } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { className, html } from '../util';

const c = className('auto-class-edit-name');

export class EditNameModal extends Modal {
  currentName = '';
  callback: (newName: string) => void;

  onOpen(): void {
    this.titleEl.innerHTML = 'Edit Group Name';
    this.contentEl.empty();
    render(
      html`<${ModalContent}
        confirm=${(value: string) => {
          this.callback(value);
          this.close();
        }}
        cancel=${this.close.bind(this)}
        value=${this.currentName}
      />`,
      this.contentEl
    );
  }
}

const ModalContent: FunctionComponent<{ confirm: (value: string) => void; cancel: () => void; value: string }> = (
  props
) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = props.value;
    }
  }, [inputRef.current, props.value]);
  return html`<input type="text" class=${c('input')} ref=${inputRef} />
    <div class=${c('controls')}>
      <button
        type="button"
        class="mod-cta"
        onClick=${() => {
          props.confirm(inputRef.current.value);
        }}
      >
        Save
      </button>
      <button type="button" onClick=${props.cancel}>Cancel</button>
    </div> `;
};
