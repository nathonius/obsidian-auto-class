import { App, FuzzySuggestModal, TFolder } from 'obsidian';

export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  selectedFolder: TFolder | null = null;

  constructor(app: App, private readonly input: HTMLInputElement, private readonly items: TFolder[]) {
    super(app);
  }

  getItems(): TFolder[] {
    return this.items;
  }

  getItemText(item: TFolder): string {
    return item.path;
  }

  onChooseItem(item: TFolder): void {
    this.input.value = item.path;
    this.selectedFolder = item;
    this.close();
  }
}
