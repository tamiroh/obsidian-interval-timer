import { Notice, type Plugin as BasePlugin, type Workspace } from "obsidian";
import {
	type TaskTracker,
	type TrackTaskResult,
} from "./obsidian-task-tracker";
import { TaskLineHighlighter } from "./obsidian-task-line-highlight-extension";
import type { IntervalTimer } from "./interval-timer";
import type { TimerDisplay } from "./timer-display";

export class TaskLineController {
	private readonly partialWorkspace: Pick<Workspace, "updateOptions">;

	private readonly timerDisplay: TimerDisplay;

	private readonly taskTracker: TaskTracker;

	private readonly taskLineHighlighter: TaskLineHighlighter;

	private intervalTimer: IntervalTimer | null = null;

	constructor(
		partialWorkspace: Pick<Workspace, "updateOptions">,
		taskTracker: TaskTracker,
		timerDisplay: TimerDisplay,
	) {
		this.partialWorkspace = partialWorkspace;
		this.timerDisplay = timerDisplay;
		this.taskTracker = taskTracker;
		this.taskLineHighlighter = new TaskLineHighlighter(
			this.taskTracker,
			() => this.isFocusActive(),
			() => {
				this.syncCurrentTask();
			},
		);
	}

	public setup(
		partialPlugin: Pick<
			BasePlugin,
			"registerDomEvent" | "registerEditorExtension"
		>,
		intervalTimer: IntervalTimer,
	): void {
		this.intervalTimer = intervalTimer;
		partialPlugin.registerEditorExtension(
			this.taskLineHighlighter.createExtension(),
		);
		partialPlugin.registerDomEvent(document, "click", (event) => {
			if (!(event.target instanceof HTMLElement)) {
				return;
			}
			const startTaskButton = event.target.closest(
				".interval-timer-task-line-highlight-start-task-button",
			);
			if (!startTaskButton) {
				return;
			}
			event.preventDefault();

			this.trackCurrentTaskFromActiveLine();
			intervalTimer.start();
		});
	}

	public trackCurrentTaskFromActiveLine(): TrackTaskResult {
		const result = this.taskTracker.trackTaskFromActiveLine();
		if (!result.ok) {
			this.taskTracker.untrack();
		}
		this.syncCurrentTask();
		this.partialWorkspace.updateOptions();
		return result;
	}

	public untrackCurrentTask(): void {
		this.taskTracker.untrack();
		this.syncCurrentTask();
		this.partialWorkspace.updateOptions();
	}

	public async completeFocusInterval(): Promise<void> {
		try {
			const result = await this.taskTracker.incrementTrackedTask();
			if (!result.ok) {
				new Notice("Failed to record task completion.");
			}
		} catch {
			new Notice("Failed to record task completion.");
		} finally {
			this.untrackCurrentTask();
		}
	}

	private syncCurrentTask(): void {
		this.timerDisplay.updateTrackedTask(
			this.taskTracker.getTrackedTaskName() ??
				this.taskTracker.getTaskNameFromActiveLine(),
		);
	}

	private isFocusActive(): boolean {
		return this.intervalTimer?.state === "focus";
	}
}
