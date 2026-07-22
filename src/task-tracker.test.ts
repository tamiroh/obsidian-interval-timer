import { beforeEach, describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { KeyValueStore } from "./key-value-store";
import { TaskTracker } from "./task-tracker";

describe("TaskTracker", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("does not track a task-looking line inside a fenced code block", () => {
		const content = `\`\`\`md
- [ ] example task 0/3
\`\`\``;
		const keyValueStore = new KeyValueStore("task-tracker-test");
		const taskTracker = new TaskTracker(
			createApp(content, 1),
			keyValueStore,
		);

		expect(taskTracker.trackTaskFromActiveLine()).toStrictEqual({
			ok: false,
			reason: "task_not_found",
		});
		expect(keyValueStore.get("current-task-name")).toBeNull();
		expect(keyValueStore.get("current-task-path")).toBeNull();
	});

	it("tracks a task line outside a fenced code block", () => {
		const content = `# Tasks

- [ ] example task 0/3`;
		const keyValueStore = new KeyValueStore("task-tracker-test");
		const taskTracker = new TaskTracker(
			createApp(content, 2),
			keyValueStore,
		);

		expect(taskTracker.trackTaskFromActiveLine()).toStrictEqual({
			ok: true,
			value: undefined,
		});
		expect(keyValueStore.get("current-task-name")).toBe("example task");
		expect(keyValueStore.get("current-task-path")).toBe("tasks.md");
	});

	it("reads the task on the active line without tracking it", () => {
		// Arrange
		const content = `# Tasks

- [ ] example task 0/3`;
		const keyValueStore = new KeyValueStore("task-tracker-test");
		const taskTracker = new TaskTracker(
			createApp(content, 2),
			keyValueStore,
		);

		// Act
		const taskName = taskTracker.getTaskNameFromActiveLine();

		// Assert
		expect(taskName).toBe("example task");
		expect(keyValueStore.get("current-task-name")).toBeNull();
		expect(keyValueStore.get("current-task-path")).toBeNull();
	});
});

const createApp = (content: string, cursorLine: number): App => {
	const lines = content.split("\n");
	return {
		workspace: {
			activeEditor: {
				editor: {
					getCursor: () => ({ line: cursorLine, ch: 0 }),
					getLine: (line: number) => lines[line] ?? "",
					getValue: () => content,
				},
			},
			getActiveFile: () => ({ path: "tasks.md" }),
		},
	} as unknown as App;
};
