import {
	App,
	Notice,
	Platform,
	Plugin as BasePlugin,
	PluginManifest,
	setIcon,
} from "obsidian";
import { match } from "ts-pattern";
import { SettingTab } from "./obsidian-setting-tab";
import {
	IntervalTimer,
	IntervalTimerState,
	type IntervalTimerStatus,
	NotifierContext,
} from "./interval-timer";
import { StatusBar } from "./status-bar";
import { FloatingTimer } from "./obsidian-floating-timer";
import { KeyValueStore } from "./key-value-store";
import {
	NotificationStyle,
	Notifier,
	createNotifier,
} from "./obsidian-notifier";
import { FlashOverlay } from "./flash-overlay";
import { TaskTracker, type TrackTaskResult } from "./obsidian-task-tracker";
import { IntervalTimerSnapshotStore } from "./interval-timer-snapshot";
import { TaskLineHighlighter } from "./obsidian-task-line-highlight-extension";
import {
	parsePositiveInteger,
	ParsePositiveIntegerResult,
} from "./value-parser";
import {
	isFocusBgmType,
	isFocusBgmVolume,
	isFocusTickSoundVolume,
	parsePluginSetting,
	PluginSetting,
} from "./obsidian-plugin-setting";
import { isMinutes, type Minutes } from "./time";
import { err, ok, type Result } from "./result";
import { FocusTickSound } from "./focus-tick-sound";
import { FocusBgm, type FocusBgmType } from "./focus-bgm";
import { AudioOutput } from "./audio-output";

export type { PluginSetting } from "./obsidian-plugin-setting";

type ParseNotificationStyleResult = Result<
	NotificationStyle,
	"invalid_notification_style"
>;

type ParseBooleanResult = Result<boolean, "invalid_boolean">;

type ParseFocusTickSoundVolumeResult = Result<
	number,
	"invalid_focus_tick_sound_volume"
>;

type ParseFocusBgmTypeResult = Result<FocusBgmType, "invalid_focus_bgm_type">;

type ParseFocusBgmVolumeResult = Result<number, "invalid_focus_bgm_volume">;

export default class Plugin extends BasePlugin {
	public override settings!: PluginSetting;

	private timerDisplay: StatusBar | FloatingTimer;

	private intervalTimer!: IntervalTimer;

	private notifier!: Notifier;

	private keyValueStore: KeyValueStore;

	private taskTracker: TaskTracker;

	private intervalTimerSnapshotStore: IntervalTimerSnapshotStore;

	private readonly taskLineHighlighter: TaskLineHighlighter;

	private readonly audioOutput = new AudioOutput();

	private readonly focusTickSound = new FocusTickSound(this.audioOutput);

	private readonly focusBgm = new FocusBgm(this.audioOutput);

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
			() => this.syncCurrentTask(),
		);
		const callbacks = {
			notify: (message: string) => new Notice(message),
			renderIcon: setIcon,
		};
		this.timerDisplay = Platform.isMobile
			? new FloatingTimer(this.app, callbacks)
			: new StatusBar(this.addStatusBarItem(), callbacks);
	}

	public override async onload(): Promise<void> {
		await this.loadSettings();
		this.notifier = createNotifier(this.settings.notificationStyle);
		this.setupIntervalTimer();
		this.setupTaskLineInteraction();
		this.addCommands();
		this.addSettingTab(new SettingTab(this.app, this));

		this.timerDisplay.enableClick(this.intervalTimer);
		this.registerDomEvent(window, "focus", () =>
			this.notifier.clearNotification(),
		);
	}

	public override onunload(): void {
		FlashOverlay.dispose();
		this.focusBgm.dispose();
		this.audioOutput.dispose();
		this.timerDisplay.dispose();
		this.intervalTimer.dispose();
	}

	public async updateSetting(
		key: keyof PluginSetting,
		value: unknown,
	): Promise<
		| ParsePositiveIntegerResult
		| Result<Minutes, "out_of_range_minutes">
		| ParseNotificationStyleResult
		| ParseBooleanResult
		| ParseFocusTickSoundVolumeResult
		| ParseFocusBgmTypeResult
		| ParseFocusBgmVolumeResult
	> {
		switch (key) {
			case "focusIntervalDuration":
			case "shortBreakDuration":
			case "longBreakDuration": {
				const parsed = parsePositiveInteger(value);
				if (!parsed.ok) return parsed;
				if (!isMinutes(parsed.value)) {
					return err("out_of_range_minutes");
				}

				this.settings[key] = parsed.value;
				this.intervalTimer.updateSettings({ [key]: parsed.value });
				await this.saveData(this.settings);

				return parsed;
			}
			case "longBreakAfter": {
				const parsed = parsePositiveInteger(value);
				if (!parsed.ok) return parsed;

				this.settings[key] = parsed.value;
				this.intervalTimer.updateSettings({ [key]: parsed.value });
				this.timerDisplay.updateLongBreakAfter(parsed.value);
				await this.saveData(this.settings);

				return parsed;
			}
			case "notificationStyle": {
				const parsed: ParseNotificationStyleResult =
					value === "system" || value === "simple"
						? ok(value)
						: err("invalid_notification_style");
				if (!parsed.ok) return parsed;

				this.notifier.clearNotification();
				this.notifier = createNotifier(parsed.value);
				this.settings.notificationStyle = parsed.value;
				await this.saveData(this.settings);

				return parsed;
			}
			case "flashOverlayEnabled": {
				const parsed: ParseBooleanResult =
					typeof value === "boolean"
						? ok(value)
						: err("invalid_boolean");
				if (!parsed.ok) return parsed;

				this.settings.flashOverlayEnabled = parsed.value;
				if (!parsed.value) {
					FlashOverlay.getInstance().hide();
				}
				await this.saveData(this.settings);

				return parsed;
			}
			case "focusTickSoundVolume": {
				const parsed: ParseFocusTickSoundVolumeResult =
					isFocusTickSoundVolume(value)
						? ok(value)
						: err("invalid_focus_tick_sound_volume");
				if (!parsed.ok) return parsed;

				this.settings.focusTickSoundVolume = parsed.value;
				this.focusTickSound.play(parsed.value);
				await this.saveData(this.settings);

				return parsed;
			}
			case "focusBgmType": {
				const parsed: ParseFocusBgmTypeResult = isFocusBgmType(value)
					? ok(value)
					: err("invalid_focus_bgm_type");
				if (!parsed.ok) return parsed;

				this.settings.focusBgmType = parsed.value;
				this.updateFocusBgmPlayback(this.intervalTimer.status, {
					previewWhenIdle: true,
				});
				await this.saveData(this.settings);

				return parsed;
			}
			case "focusBgmVolume": {
				const parsed: ParseFocusBgmVolumeResult = isFocusBgmVolume(
					value,
				)
					? ok(value)
					: err("invalid_focus_bgm_volume");
				if (!parsed.ok) return parsed;

				this.settings.focusBgmVolume = parsed.value;
				this.updateFocusBgmPlayback(this.intervalTimer.status, {
					previewWhenIdle: true,
				});
				await this.saveData(this.settings);

				return parsed;
			}
		}
	}

	private updateFocusBgmPlayback(
		{ timerState, snapshot }: IntervalTimerStatus,
		options?: { previewWhenIdle: boolean },
	): void {
		const { focusBgmType, focusBgmVolume } = this.settings;

		if (snapshot.state === "focus" && timerState === "running") {
			this.focusBgm.play(focusBgmType, focusBgmVolume);
			return;
		}
		if (options?.previewWhenIdle === true) {
			this.focusBgm.preview(focusBgmType, focusBgmVolume);
			return;
		}
		this.focusBgm.stop();
	}

	private setupIntervalTimer(): void {
		const updateTimerState = ({
			timerState,
			snapshot,
		}: IntervalTimerStatus) => {
			this.intervalTimerSnapshotStore.save(
				snapshot.state,
				snapshot,
				snapshot.focusIntervals,
			);
			this.timerDisplay.update(
				snapshot.focusIntervals,
				snapshot,
				snapshot.state,
				timerState,
				this.settings.longBreakAfter,
			);
			if (timerState === "initialized") {
				this.untrackCurrentTask();
			}
		};
		const onNotify = (message: string, context: NotifierContext) => {
			if (this.settings.flashOverlayEnabled) {
				const overlayColor = match(context.state)
					.with("focus", () => ({ r: 255, g: 100, b: 100 }))
					.with("shortBreak", "longBreak", () => ({
						r: 100,
						g: 255,
						b: 100,
					}))
					.exhaustive();
				FlashOverlay.getInstance().show(overlayColor);
			}
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
				.then((result) => {
					if (!result.ok) {
						new Notice("Failed to record task completion.");
					}
				})
				.catch(() => {
					new Notice("Failed to record task completion.");
				})
				.finally(() => {
					this.untrackCurrentTask();
				});
		};
		const snapshot = this.intervalTimerSnapshotStore.load();

		this.intervalTimer = new IntervalTimer({
			focusIntervalDuration: this.settings.focusIntervalDuration,
			shortBreakDuration: this.settings.shortBreakDuration,
			longBreakDuration: this.settings.longBreakDuration,
			longBreakAfter: this.settings.longBreakAfter,
			resetTime: { hours: 0, minutes: 0 }, // TODO: Maybe make this configurable on setting tab?
		});
		this.intervalTimer.subscribe((event) => {
			switch (event.type) {
				case "state-changed":
					updateTimerState(event);
					this.updateFocusBgmPlayback(event);
					if (
						this.settings.focusTickSoundVolume > 0 &&
						event.snapshot.state === "focus" &&
						event.timerState === "running"
					) {
						this.focusTickSound.play(
							this.settings.focusTickSoundVolume,
						);
					}
					break;
				case "timer-started":
					if (event.mode === "fresh") {
						onStartedFreshly(event.snapshot.state);
					}
					break;
				case "focus-interval-ended":
					onFocusIntervalEnded();
					break;
				case "interval-completed":
					onNotify(event.notificationMessage, {
						state: event.to,
					});
					break;
			}
		});
		updateTimerState(this.intervalTimer.status);
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

	private syncCurrentTask(): void {
		this.timerDisplay.updateTrackedTask(
			this.taskTracker.getTrackedTaskName() ??
				this.taskTracker.getTaskNameFromActiveLine(),
		);
	}

	private untrackCurrentTask(): void {
		this.taskTracker.untrack();
		this.syncCurrentTask();
		this.app.workspace.updateOptions();
	}

	private trackCurrentTaskFromActiveLine(): TrackTaskResult {
		const result = this.taskTracker.trackTaskFromActiveLine();
		if (!result.ok) {
			this.taskTracker.untrack();
		}
		this.syncCurrentTask();
		this.app.workspace.updateOptions();
		return result;
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
