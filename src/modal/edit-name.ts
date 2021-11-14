import { Modal } from 'obsidian';

export class EditNameModal extends Modal {
  currentName = '';
  callback: (newName: string) => void;

  onOpen(): void {
    this.contentEl.empty();
    const input = this.contentEl.createEl('input', { cls: 'auto-class-edit-name__input', attr: { type: 'text' } });
    input.value = this.currentName;
    const controls = this.contentEl.createDiv({ cls: 'auto-class-edit-name__controls' });
    const confirmButton = controls.createEl('button', { text: 'Save', cls: 'mod-cta' });
    confirmButton.addEventListener('click', () => {
      this.callback(input.value);
      this.close();
    });
    const cancelButton = controls.createEl('button', { text: 'Cancel' });
    cancelButton.addEventListener('click', () => {
      this.close();
    });
  }
}
