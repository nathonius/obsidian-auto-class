import { App, FuzzySuggestModal, TFolder } from 'obsidian';

export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  items: TFolder[] = [];
  callback: (folder: TFolder) => void | undefined;
  selectedFolder: TFolder | null = null;

  constructor(app: App) {
    super(app);
  }

  getItems(): TFolder[] {
    return this.items;
  }

  getItemText(item: TFolder): string {
    return item.path;
  }

  onChooseItem(item: TFolder): void {
    if (this.callback) {
      this.callback(item);
    }
    this.close();
  }
}
