import { Menu, Notice, Plugin, TAbstractFile, TFile } from 'obsidian';

// Картинки, PDF, аудио и видео Obsidian умеет встраивать в заметку через ![[...]].
const EMBEDDABLE = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'avif',
  'pdf',
  'mp3', 'wav', 'm4a', 'ogg', 'flac', '3gp', 'webm',
  'mp4', 'ogv', 'mov', 'mkv',
]);

export default class CopyWikilinkPlugin extends Plugin {
  async onload() {
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => this.addItems(menu, [file]))
    );
    // Несколько выделенных файлов в проводнике.
    this.registerEvent(
      this.app.workspace.on('files-menu', (menu, files) => this.addItems(menu, files))
    );

    this.addCommand({
      id: 'copy-active-file-link',
      name: 'Скопировать ссылку на текущий файл',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) this.copy([file], false);
        return true;
      },
    });
  }

  private addItems(menu: Menu, items: TAbstractFile[]) {
    // Папки не бывают целью ссылки — пропускаем.
    const files = items.filter((f): f is TFile => f instanceof TFile);
    if (!files.length) return;
    const many = files.length > 1;

    menu.addItem((item) =>
      item
        .setSection('action')
        .setTitle(many ? `Скопировать ссылки (${files.length})` : 'Скопировать ссылку')
        .setIcon('link')
        .onClick(() => this.copy(files, false))
    );

    if (files.every((f) => EMBEDDABLE.has(f.extension.toLowerCase()))) {
      menu.addItem((item) =>
        item
          .setSection('action')
          .setTitle(many ? `Скопировать для встраивания (${files.length})` : 'Скопировать для встраивания')
          .setIcon('image')
          .onClick(() => this.copy(files, true))
      );
    }
  }

  private link(file: TFile, embed: boolean): string {
    // Кратчайший однозначный путь с учётом настроек ссылок хранилища; .md отбрасывается.
    const text = this.app.metadataCache.fileToLinktext(file, '', true);
    return `${embed ? '!' : ''}[[${text}]]`;
  }

  private async copy(files: TFile[], embed: boolean) {
    const text = files.map((f) => this.link(f, embed)).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      new Notice(files.length > 1 ? `Скопировано ссылок: ${files.length}` : `Скопировано: ${text}`);
    } catch (e) {
      console.error('[copy-wikilink]', e);
      new Notice('Не удалось скопировать ссылку в буфер обмена');
    }
  }
}
