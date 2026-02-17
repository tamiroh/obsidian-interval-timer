import { App, Plugin as BasePlugin, PluginManifest } from "obsidian";
import { match } from "ts-pattern";
import { DEFAULT_SETTINGS, PluginSetting, SettingTab } from "./setting-tab";
import {
	IntervalTimer,
	IntervalTimerState,
	NotifierContext,
	onChangeStateFunction,
} from "./interval-timer";
import { StatusBar } from "./status-bar";
import { KeyValueStore } from "./key-value-store";
import { notify } from "./notifier";
import { FlashOverlay } from "./flash-overlay";
import { TaskTracker } from "./task-tracker";
import { IntervalTimerSnapshotStore } from "./interval-timer-snapshot";
import { TaskLineHighlighter } from "./task-line-highlight-extension";

export default class Plugin extends BasePlugin {
	public settings!: PluginSetting;

	private statusBar: StatusBar;

	private intervalTimer!: IntervalTimer;

	private keyValueStore: KeyValueStore;

	private taskTracker: TaskTracker;

	private intervalTimerSnapshotStore: IntervalTimerSnapshotStore;

	private readonly taskLineHighlighter: TaskLineHighlighter;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		this.keyValueStore = new KeyValueStore(manifest.id);
		this.taskTracker = new TaskTracker(this.app, this.keyValueStore);
		this.intervalTimerSnapshotStore = new IntervalTimerSnapshotStore(
			this.keyValueStore,
		);
		this.taskLineHighlighter = new TaskLineHighlighter(
			this.taskTracker,
			() => this.intervalTimer.state === "focus",
		);
		this.statusBar = new StatusBar(this.addStatusBarItem(), this.app);
	}

	public override async onload(): Promise<void> {
		await this.loadSettings();
		this.setupIntervalTimer();
		this.setupTaskLineInteraction();
		this.addCommands();
		this.addSettingTab(new SettingTab(this.app, this));

		this.statusBar.enableClick(this.intervalTimer);
	}

	public override onunload(): void {
		FlashOverlay.dispose();
		this.intervalTimer.dispose();
	}

	public async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private setupIntervalTimer(): void {
		const onChangeState: onChangeStateFunction = (
			timerState,
			intervalTimerState,
			time,
			intervals,
		) => {
			this.intervalTimerSnapshotStore.save(
				intervalTimerState,
				time,
				intervals,
			);
			this.statusBar.update(intervals, time, intervalTimerState);
			if (timerState === "initialized") {
				this.untrackCurrentTask();
			}
		};
		const notifier = (message: string, context: NotifierContext) => {
			const overlayColor = match(context.state)
				.with("focus", () => ({ r: 255, g: 100, b: 100 }))
				.with("shortBreak", "longBreak", () => ({
					r: 100,
					g: 255,
					b: 100,
				}))
				.exhaustive();
			FlashOverlay.getInstance().show(overlayColor);
			notify(this.settings.notificationStyle, message);
		};
		const onStartedFreshly = (state: IntervalTimerState) => {
			if (state === "focus") {
				this.trackCurrentTaskFromActiveLine();
			}
		};
		const onFocusIntervalEnded = () => {
			this.taskTracker.incrementTrackedTask().finally(() => {
				this.untrackCurrentTask();
			});
		};
		const snapshot = this.intervalTimerSnapshotStore.load();

		this.intervalTimer = new IntervalTimer(
			onChangeState,
			this.settings,
			notifier,
			onStartedFreshly,
			onFocusIntervalEnded,
		);
		if (snapshot !== null) {
			this.intervalTimer.applySnapshot(snapshot);
		}
		this.intervalTimer.enableAutoReset();
	}

	private setupTaskLineInteraction(): void {
		this.registerEditorExtension(
			this.taskLineHighlighter.createExtension(),
		);
		this.registerDomEvent(document, "click", (event) => {
			if (!(event.target instanceof HTMLElement)) {
				return;
			}
			const startTaskButton = event.target.closest(
				".interval-timer-start-task-button",
			);
			if (!startTaskButton) {
				return;
			}
			event.preventDefault();

			this.trackCurrentTaskFromActiveLine();
			this.intervalTimer.start();
		});
	}

	private syncCurrentTaskTooltip(): void {
		this.statusBar.updateTrackedTaskTooltip(
			this.taskTracker.getTrackedTaskName(),
		);
	}

	private untrackCurrentTask(): void {
		this.taskTracker.untrack();
		this.syncCurrentTaskTooltip();
		this.app.workspace.updateOptions();
	}

	private trackCurrentTaskFromActiveLine(): boolean {
		const tracked = this.taskTracker.trackTaskFromActiveLine();
		if (!tracked) {
			this.taskTracker.untrack();
		}
		this.syncCurrentTaskTooltip();
		this.app.workspace.updateOptions();
		return tracked;
	}

	private addCommands(): void {
		this.addCommand({
			id: "start-timer",
			name: "Start timer",
			callback: () => this.intervalTimer.start(),
		});
		this.addCommand({
			id: "pause-timer",
			name: "Pause timer",
			callback: () => this.intervalTimer.pause(),
		});
		this.addCommand({
			id: "reset-timer",
			name: "Reset timer",
			callback: () => this.intervalTimer.reset(),
		});
		this.addCommand({
			id: "reset-intervals-set",
			name: "Reset intervals set",
			callback: () => this.intervalTimer.resetIntervalsSet(),
		});
		this.addCommand({
			id: "reset-total-intervals",
			name: "Reset total intervals",
			callback: () => this.intervalTimer.resetTotalIntervals(),
		});
		this.addCommand({
			id: "skip-interval", // TODO: only show this command when the timer type is break
			name: "Skip interval",
			callback: () => this.intervalTimer.skipInterval(),
		});
	}

	private async loadSettings(): Promise<void> {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	}
}
