import { Modal } from 'obsidian';

export class ConfirmModal extends Modal {
  confirm = 'Yes';
  cancel = 'No';
  message = '';
  callback: (response: boolean) => void;

  onOpen(): void {
    this.display();
  }

  display() {
    this.contentEl.empty();
    this.contentEl.createEl('p', { text: this.message });
    const controls = this.contentEl.createDiv({ cls: 'auto-class-confirm-modal__controls' });
    const confirmButton = controls.createEl('button', { text: this.confirm, cls: 'mod-cta' });
    confirmButton.addEventListener('click', () => {
      this.callback(true);
    });
    const cancelButton = controls.createEl('button', { text: this.cancel });
    cancelButton.addEventListener('click', () => {
      this.callback(false);
    });
  }
}
