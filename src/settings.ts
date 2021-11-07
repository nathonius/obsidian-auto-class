import { App, PluginSettingTab, setIcon, TFolder } from 'obsidian';
import { ClassPathScope } from './enum';
import { FolderSuggestModal } from './folder-suggest';
import { AutoClassPluginSettings, ClassPath } from './interfaces';
import { AutoClassPlugin } from './plugin';

export class AutoClassPluginSettingsTab extends PluginSettingTab {
  private readonly folderSuggestModal: FolderSuggestModal = new FolderSuggestModal(this.app);

  constructor(readonly app: App, private readonly plugin: AutoClassPlugin) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();

    // Render title and description
    this.containerEl.createEl('h2', { text: 'Auto Class settings.' });
    this.containerEl.createEl('p', {
      text: 'Input a folder path in the first column and a set of css classes (comma separated), into the second column. Select the scope for the classes in the third column. In the selected modes, the classes will automatically be applied to all notes that are children of that folder.'
    });
    this.containerEl.createEl('p', {
      text: "Combine this with CSS snippets that target the classes you configure here to automatically apply styles based on a note's path."
    });

    this.renderPathTable(this.containerEl, this.plugin.settings);
  }

  private renderPathTable(parent: HTMLElement, settings: AutoClassPluginSettings): void {
    const table = parent.createEl('table', { cls: 'auto-class-settings__table' });
    this.renderTableHeader(table.createTHead());
    this.renderTableBody(table.createTBody(), settings.paths);
  }

  private renderTableHeader(thead: HTMLTableSectionElement) {
    const headerRow = thead.insertRow();
    headerRow.createEl('th', { text: 'Path' });
    headerRow.createEl('th', { text: 'Classes' });
    headerRow.createEl('th', { text: 'Scope' });
    headerRow.createEl('th');
  }

  private renderTableBody(tbody: HTMLTableSectionElement, paths: ClassPath[]) {
    this.renderNewPathRow(tbody);
    paths.forEach((path) => {
      const row = tbody.createEl('tr', { cls: 'auto-class-settings__table-row' });
      row.createEl('td', { text: path.path });
      row.createEl('td', { text: path.classes.join(', '), cls: 'auto-class-settings__class-cell' });
      row.createEl('td', { text: path.scope });
      const deleteCell = row.createEl('td', { cls: 'auto-class-settings__button-cell' });
      const deleteButton = deleteCell.createEl('button', { text: 'Delete' });
      deleteButton.addEventListener('click', () => this.deletePath(path));
    });
  }

  private renderNewPathRow(tbody: HTMLTableSectionElement): void {
    const inputRow = tbody.createEl('tr', {
      cls: ['auto-class-settings__table-row', 'auto-class-settings__input-row']
    });
    const pathCell = inputRow.createEl('td');
    const pathCellFlexContainer = pathCell.createDiv({ cls: 'auto-class-settings__flex-container' });
    const pathButton = pathCellFlexContainer.createEl('button', { cls: 'auto-class-settings__input-button' });
    setIcon(pathButton, 'folder');
    const folders: TFolder[] = this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder) as TFolder[];
    pathButton.addEventListener('click', () => {
      this.folderSuggestModal.selectedFolder = null;
      this.folderSuggestModal.items = folders;
      this.folderSuggestModal.callback = (folder: TFolder) => {
        pathInput.value = folder.path;
      };
      this.folderSuggestModal.open();
    });
    // const pathInputContainer = pathCell.createDiv();
    const pathInput = pathCellFlexContainer.createEl('input', {
      attr: { placeholder: 'Folder', type: 'text' }
    });

    const classCell = inputRow.createEl('td');
    const classCellFlexContainer = classCell.createDiv({ cls: 'auto-class-settings__flex-container' });
    const classInput = classCellFlexContainer.createEl('input', {
      attr: { placeholder: 'class1, class2', type: 'text' }
    });

    const scopeCell = inputRow.createEl('td');
    const scopeSelect = scopeCell.createEl('select', { cls: 'dropdown' });
    const previewOption = scopeSelect.createEl('option', {
      text: ClassPathScope.Preview,
      attr: { value: ClassPathScope.Preview }
    });
    previewOption.selected = true;
    scopeSelect.createEl('option', { text: ClassPathScope.Edit, attr: { value: ClassPathScope.Edit } });
    scopeSelect.createEl('option', { text: ClassPathScope.Both, attr: { value: ClassPathScope.Both } });

    const addCell = inputRow.createEl('td', { cls: 'auto-class-settings__button-cell' });
    const addButton = addCell.createEl('button', { cls: 'mod-cta', text: 'Add' });

    addButton.addEventListener('click', async () => {
      if (pathInput.value && classInput.value) {
        // Normalize path to end with a slash
        if (!pathInput.value.endsWith('/')) {
          pathInput.value = `${pathInput.value}/`;
        }
        this.plugin.settings.paths.unshift({
          path: pathInput.value,
          classes: this.plugin.getClassList(classInput.value),
          scope: scopeSelect.value as ClassPathScope
        });
        await this.plugin.saveSettings();
        this.display();
      }
    });
  }

  private async deletePath(classPath: ClassPath): Promise<void> {
    this.plugin.settings.paths.remove(classPath);
    await this.plugin.saveSettings();
    this.display();
  }
}
