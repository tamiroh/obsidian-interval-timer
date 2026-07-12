import { App, Notice, Plugin as BasePlugin, PluginManifest } from "obsidian";
import { match } from "ts-pattern";
import { SettingTab } from "./setting-tab";
import {
	IntervalTimer,
	IntervalTimerState,
	NotifierContext,
	onChangeStateFunction,
} from "./interval-timer";
import { StatusBar } from "./status-bar";
import { KeyValueStore } from "./key-value-store";
import { NotificationStyle, Notifier, createNotifier } from "./notifier";
import { FlashOverlay } from "./flash-overlay";
import { TaskTracker } from "./task-tracker";
import { IntervalTimerSnapshotStore } from "./interval-timer-snapshot";
import { TaskLineHighlighter } from "./task-line-highlight-extension";
import {
	parsePositiveInteger,
	ParsePositiveIntegerResult,
} from "./value-parser";
import { parsePluginSetting, PluginSetting } from "./plugin-setting";
import type { Result } from "./result";

export type { PluginSetting } from "./plugin-setting";

type ParseNotificationStyleResult = Result<
	NotificationStyle,
	"invalid_notification_style"
>;

export default class Plugin extends BasePlugin {
	public override settings!: PluginSetting;

	private statusBar: StatusBar;

	private intervalTimer!: IntervalTimer;

	private notifier!: Notifier;

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
		this.notifier = createNotifier(this.settings.notificationStyle);
		this.setupIntervalTimer();
		this.setupTaskLineInteraction();
		this.addCommands();
		this.addSettingTab(new SettingTab(this.app, this));

		this.statusBar.enableClick(this.intervalTimer);
		this.registerDomEvent(window, "focus", () =>
			this.notifier.clearNotification(),
		);
	}

	public override onunload(): void {
		FlashOverlay.dispose();
		this.intervalTimer.dispose();
	}

	public async updateSetting(
		key: keyof PluginSetting,
		value: unknown,
	): Promise<ParsePositiveIntegerResult | ParseNotificationStyleResult> {
		switch (key) {
			case "focusIntervalDuration":
			case "shortBreakDuration":
			case "longBreakDuration":
			case "longBreakAfter": {
				const parsed = parsePositiveInteger(value);
				if (!parsed.ok) return parsed;

				this.settings[key] = parsed.value;
				this.intervalTimer.updateSettings({ [key]: parsed.value });
				await this.saveData(this.settings);

				return parsed;
			}
			case "notificationStyle": {
				const parsed: ParseNotificationStyleResult =
					value === "system" || value === "simple"
						? { ok: true, value }
						: { ok: false, reason: "invalid_notification_style" };
				if (!parsed.ok) return parsed;

				this.notifier.clearNotification();
				this.notifier = createNotifier(parsed.value);
				this.settings.notificationStyle = parsed.value;
				await this.saveData(this.settings);

				return parsed;
			}
		}
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
			this.statusBar.update(
				intervals,
				time,
				intervalTimerState,
				timerState,
			);
			if (timerState === "initialized") {
				this.untrackCurrentTask();
			}
		};
		const onNotify = (message: string, context: NotifierContext) => {
			const overlayColor = match(context.state)
				.with("focus", () => ({ r: 255, g: 100, b: 100 }))
				.with("shortBreak", "longBreak", () => ({
					r: 100,
					g: 255,
					b: 100,
				}))
				.exhaustive();
			FlashOverlay.getInstance().show(overlayColor);
			this.notifier.notify(message);
		};
		const onStartedFreshly = (state: IntervalTimerState) => {
			if (state === "focus") {
				this.trackCurrentTaskFromActiveLine();
			}
		};
		const onFocusIntervalEnded = () => {
			this.taskTracker
				.incrementTrackedTask()
				.catch(() => {
					new Notice("Failed to record task completion.");
				})
				.finally(() => {
					this.untrackCurrentTask();
				});
		};
		const snapshot = this.intervalTimerSnapshotStore.load();

		this.intervalTimer = new IntervalTimer(
			onChangeState,
			{
				focusIntervalDuration: this.settings.focusIntervalDuration,
				shortBreakDuration: this.settings.shortBreakDuration,
				longBreakDuration: this.settings.longBreakDuration,
				longBreakAfter: this.settings.longBreakAfter,
				resetTime: { hours: 0, minutes: 0 }, // TODO: Maybe make this configurable on setting tab?
			},
			onNotify,
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
			checkCallback: (checking) => {
				const canStart = this.intervalTimer.canStart;
				if (!checking && canStart) this.intervalTimer.start();
				return canStart;
			},
		});
		this.addCommand({
			id: "pause-timer",
			name: "Pause timer",
			checkCallback: (checking) => {
				const canPause = this.intervalTimer.canPause;
				if (!checking && canPause) this.intervalTimer.pause();
				return canPause;
			},
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
			id: "skip-interval",
			name: "Skip interval",
			checkCallback: (checking) => {
				const canSkip = this.intervalTimer.state !== "focus";
				if (!checking && canSkip) this.intervalTimer.skipInterval();
				return canSkip;
			},
		});
	}

	private async loadSettings(): Promise<void> {
		this.settings = parsePluginSetting(await this.loadData());
	}
}
