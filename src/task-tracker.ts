import { TFile, type App } from "obsidian";
import { KeyValueStore } from "./key-value-store";
import { TaskManagementFile } from "./task-management-file";
import { TaskLine } from "./task-line";
import { Markdown } from "./markdown";
import type { Result } from "./result";

export type TrackTaskResult = Result<
	void,
	"active_file_not_found" | "task_not_found"
>;

export type IncrementTrackedTaskResult = Result<
	void,
	"tracked_task_not_found" | "tracked_file_not_found" | "task_not_found"
>;

export class TaskTracker {
	private readonly app: App;

	private readonly keyValueStore: KeyValueStore;

	constructor(app: App, keyValueStore: KeyValueStore) {
		this.app = app;
		this.keyValueStore = keyValueStore;
	}

	public trackTaskFromActiveLine(): TrackTaskResult {
		const filePath = this.app.workspace.getActiveFile()?.path;
		if (!filePath) {
			return { ok: false, reason: "active_file_not_found" };
		}

		const taskName = this.getTaskNameFromActiveLine();
		if (!taskName) {
			return { ok: false, reason: "task_not_found" };
		}

		this.keyValueStore.set("current-task-name", taskName);
		this.keyValueStore.set("current-task-path", filePath);
		return { ok: true, value: undefined };
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

	public async incrementTrackedTask(): Promise<IncrementTrackedTaskResult> {
		const name = this.keyValueStore.get("current-task-name");
		const filePath = this.keyValueStore.get("current-task-path");
		if (!name || !filePath) {
			return { ok: false, reason: "tracked_task_not_found" };
		}

		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			return { ok: false, reason: "tracked_file_not_found" };
		}

		const incrementedTaskManagementFile = new TaskManagementFile(
			await this.app.vault.read(file),
		).toIncremented(name);
		if (!incrementedTaskManagementFile) {
			return { ok: false, reason: "task_not_found" };
		}

		await this.app.vault.modify(
			file,
			incrementedTaskManagementFile.toContent(),
		);
		return { ok: true, value: undefined };
	}

	public untrack(): void {
		this.keyValueStore.delete("current-task-name");
		this.keyValueStore.delete("current-task-path");
	}

	public getTrackedTaskName(): string | null {
		return this.keyValueStore.get("current-task-name");
	}
}
