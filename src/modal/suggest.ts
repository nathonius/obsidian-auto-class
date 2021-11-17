import { App, FuzzySuggestModal, TFolder } from 'obsidian';

export class SuggestModal extends FuzzySuggestModal<TFolder | string> {
  items: Array<TFolder | string> = [];
  callback: (choice: TFolder | string) => void | undefined;
  selectedItem: TFolder | string | null = null;

  constructor(app: App) {
    super(app);
  }

  getItems(): Array<TFolder | string> {
    return this.items;
  }

  getItemText(item: TFolder | string): string {
    return typeof item === 'string' ? item : item.path;
  }

  onChooseItem(item: TFolder | string): void {
    if (this.callback) {
      this.callback(item);
    }
    this.close();
  }
}
