import { TFile, type App } from "obsidian";
import { KeyValueStore } from "./key-value-store";
import { TaskManagementFile } from "./task-management-file";
import { TaskLine } from "./task-line";

export class TaskTracker {
	private readonly app: App;

	private readonly keyValueStore: KeyValueStore;

	constructor(app: App, keyValueStore: KeyValueStore) {
		this.app = app;
		this.keyValueStore = keyValueStore;
	}

	public trackTaskFromActiveLine(): boolean {
		const editor = this.app.workspace.activeEditor?.editor;
		const filePath = this.app.workspace.getActiveFile()?.path;
		if (!editor || !filePath) {
			return false;
		}

		const taskLineOnCursor = TaskLine.from(
			editor.getLine(editor.getCursor().line),
		);
		if (!taskLineOnCursor) {
			return false;
		}

		this.keyValueStore.set("current-task-name", taskLineOnCursor.taskName);
		this.keyValueStore.set("current-task-path", filePath);
		return true;
	}

	public async incrementTrackedTask(): Promise<boolean> {
		const name = this.keyValueStore.get("current-task-name");
		const filePath = this.keyValueStore.get("current-task-path");
		if (!name || !filePath) {
			return false;
		}

		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			return false;
		}

		const incrementedTaskManagementFile = new TaskManagementFile(
			await this.app.vault.read(file),
		).toIncremented(name);
		if (!incrementedTaskManagementFile) {
			return false;
		}

		await this.app.vault.modify(
			file,
			incrementedTaskManagementFile.toContent(),
		);
		return true;
	}

	public untrack(): void {
		this.keyValueStore.delete("current-task-name");
		this.keyValueStore.delete("current-task-path");
	}

	public getTrackedTaskName(): string | null {
		return this.keyValueStore.get("current-task-name");
	}
}
