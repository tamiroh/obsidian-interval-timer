import type { App } from "obsidian";
import type { FileSystem } from "./filesystem";

export class ObsidianFileSystem implements FileSystem {
	constructor(private readonly app: App) {}

	public exists(path: string): Promise<boolean> {
		return this.app.vault.adapter.exists(path);
	}

	public mkdir(path: string): Promise<void> {
		return this.app.vault.adapter.mkdir(path);
	}

	public write(path: string, data: string): Promise<void> {
		return this.app.vault.adapter.write(path, data);
	}

	public list(path: string): Promise<{ files: string[]; folders: string[] }> {
		return this.app.vault.adapter.list(path);
	}

	public read(path: string): Promise<string> {
		return this.app.vault.adapter.read(path);
	}
}
