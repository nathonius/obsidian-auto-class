import { App, FuzzySuggestModal, TFolder } from 'obsidian';
import { RuleTargetType } from '../enum';

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

  setItems(target: RuleTargetType): void {
    if (target === RuleTargetType.Path) {
      const folders: TFolder[] = this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder) as TFolder[];
      this.selectedItem = null;
      this.items = folders;
    } else if (target === RuleTargetType.Tag) {
      const tags: string[] = Object.keys((this.app.metadataCache as any).getTags());
      this.selectedItem = null;
      this.items = tags;
    }
  }
}
