import { App, PluginSettingTab } from 'obsidian';
import { AutoClassPluginSettings } from './interfaces';
import { AutoClassPlugin } from './plugin';

export class AutoClassPluginSettingsTab extends PluginSettingTab {
  constructor(readonly app: App, private readonly plugin: AutoClassPlugin) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();
    this.renderNewPath(this.containerEl);
    this.renderPathTable(this.containerEl, this.plugin.settings);
  }

  private renderNewPath(parent: HTMLElement): void {
    const inputContainer = parent.createDiv();
    const pathInput = inputContainer.createEl('input', { attr: { type: 'text', id: 'pathInput' } });
    pathInput.placeholder = 'Folder/Subfolder/ChildFolder';
    inputContainer.createEl('label', { text: 'Folder path', attr: { for: 'pathInput' } });
    const classInput = inputContainer.createEl('input', { attr: { type: 'text', id: 'classInput' } });
    classInput.placeholder = 'class1, class2, class3';
    inputContainer.createEl('label', { text: 'Classes', attr: { for: 'classInput' } });
    const saveButton = parent.createEl('button', { text: 'Save path', cls: 'mod-cta' });
    saveButton.addEventListener('click', async () => {
      if (pathInput.value && classInput.value) {
        // Normalize path to end with a slash
        if (!pathInput.value.endsWith('/')) {
          pathInput.value = `${pathInput.value}/`;
        }
        this.plugin.settings.paths[pathInput.value] = classInput.value;
        await this.plugin.saveSettings();
        this.display();
      }
    });
  }

  private renderPathTable(parent: HTMLElement, settings: AutoClassPluginSettings): void {
    const table = parent.createEl('table');
    // Create header
    this.renderTableHeader(table.createTHead());
    this.renderTableBody(table.createTBody(), settings.paths);
  }

  private renderTableHeader(thead: HTMLTableSectionElement) {
    const headerRow = thead.insertRow();
    headerRow.createEl('th', { text: 'Path' });
    headerRow.createEl('th', { text: 'Classes' });
    headerRow.createEl('th');
  }

  private renderTableBody(tbody: HTMLTableSectionElement, paths: Record<string, string>) {
    Object.keys(paths).forEach((key) => {
      const row = tbody.insertRow();
      row.createEl('td', { text: key });
      row.createEl('td', { text: paths[key] });
      const deleteCell = row.createEl('td', { text: 'X' });
      deleteCell.addEventListener('click', () => this.deletePath(key));
    });
  }

  private deletePath(key: string): void {
    delete this.plugin.settings.paths[key];
    this.display();
  }
}
