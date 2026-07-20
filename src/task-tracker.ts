import { TFile, type App } from "obsidian";
import { KeyValueStore } from "./key-value-store";
import { TaskManagementFile } from "./task-management-file";
import { TaskLine } from "./task-line";
import { Markdown } from "./markdown";

export class TaskTracker {
	private readonly app: App;

	private readonly keyValueStore: KeyValueStore;

	constructor(app: App, keyValueStore: KeyValueStore) {
		this.app = app;
		this.keyValueStore = keyValueStore;
	}

	public trackTaskFromActiveLine(): boolean {
		const filePath = this.app.workspace.getActiveFile()?.path;
		const taskName = this.getTaskNameFromActiveLine();
		if (!filePath || !taskName) {
			return false;
		}

		this.keyValueStore.set("current-task-name", taskName);
		this.keyValueStore.set("current-task-path", filePath);
		return true;
	}

	public getTaskNameFromActiveLine(): string | null {
		const editor = this.app.workspace.activeEditor?.editor;
		if (!editor) return null;

		const cursor = editor.getCursor();
		const taskLineOnCursor = TaskLine.from(editor.getLine(cursor.line));
		if (
			!taskLineOnCursor ||
			new Markdown(editor.getValue()).isLineInCodeBlock(cursor.line + 1)
		) {
			return null;
		}

		return taskLineOnCursor.taskName;
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
