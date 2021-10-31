import { App, PluginSettingTab } from 'obsidian';
import { AutoClassPluginSettings } from './interfaces';
import { AutoClassPlugin } from './plugin';

export class AutoClassPluginSettingsTab extends PluginSettingTab {
  constructor(readonly app: App, private readonly plugin: AutoClassPlugin) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();

    // Render title and description
    this.containerEl.createEl('h2', { text: 'Auto Class settings.' });
    this.containerEl.createEl('p', {
      text: 'Input a folder path in the first column and a set of css classes (comma separated), into the second column. In preview mode, the classes will automatically be applied to all notes that are children of that folder.'
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
    headerRow.createEl('th');
  }

  private renderTableBody(tbody: HTMLTableSectionElement, paths: Record<string, string>) {
    this.renderNewPathRow(tbody);
    Object.keys(paths).forEach((key) => {
      const row = tbody.createEl('tr', { cls: 'auto-class-settings__table-row' });
      row.createEl('td', { text: key });
      row.createEl('td', { text: paths[key], cls: 'auto-class-settings__class-cell' });
      const deleteCell = row.createEl('td', { cls: 'auto-class-settings__button-cell' });
      const deleteButton = deleteCell.createEl('button', { text: 'Delete' });
      deleteButton.addEventListener('click', () => this.deletePath(key));
    });
  }

  private renderNewPathRow(tbody: HTMLTableSectionElement): void {
    const inputRow = tbody.createEl('tr', {
      cls: ['auto-class-settings__table-row', 'auto-class-settings__input-row']
    });
    const pathCell = inputRow.createEl('td');
    const pathInput = pathCell.createEl('input', {
      attr: { placeholder: 'Folder', type: 'text' }
    });

    const classCell = inputRow.createEl('td');
    const classInput = classCell.createEl('input', { attr: { placeholder: 'class1, class2', type: 'text' } });

    const addCell = inputRow.createEl('td', { cls: 'auto-class-settings__button-cell' });
    const addButton = addCell.createEl('button', { cls: 'mod-cta', text: 'Add' });

    addButton.addEventListener('click', async () => {
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

  private deletePath(key: string): void {
    delete this.plugin.settings.paths[key];
    this.display();
  }
}
