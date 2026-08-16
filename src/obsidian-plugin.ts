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
import { NotificationStyle, Notifier } from "./notification";
import { createNotifier } from "./obsidian-notification";
import { FlashOverlay } from "./flash-overlay";
import { IntervalTimerSnapshotStore } from "./interval-timer-snapshot";
import { TaskTracker } from "./obsidian-task-tracker";
import { TaskLineController } from "./obsidian-task-line-controller";
import {
	parsePositiveInteger,
	ParsePositiveIntegerResult,
} from "./value-parser";
import {
	defaultPluginSetting,
	isFocusBgmType,
	isFocusBgmVolume,
	isFocusTickSoundVolume,
	parsePluginSetting,
	PluginSetting,
	type PluginSettingStore,
} from "./obsidian-plugin-setting";
import { isMinutes, type Minutes } from "./time";
import { err, ok, type Result } from "./result";
import { FocusTickSound } from "./focus-tick-sound";
import { FocusBgm, type FocusBgmType } from "./focus-bgm";
import { AudioOutput } from "./audio-output";
import { registerCommands } from "./obsidian-plugin-commands";
import type { TimerDisplay } from "./timer-display";
import { ObservableStore } from "./observable-store";

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

type SettingsReload = {
	readonly keys: readonly (keyof PluginSetting)[];
	readonly reload: (next: PluginSetting) => void;
};

export class Plugin extends BasePlugin {
	private readonly settingStore: PluginSettingStore =
		new ObservableStore<PluginSetting>(defaultPluginSetting);

	public get currentSettings(): Readonly<PluginSetting> {
		return this.settingStore.state;
	}

	private timerDisplay: TimerDisplay;

	private intervalTimer!: IntervalTimer;

	private notifier!: Notifier;

	private keyValueStore: KeyValueStore;

	private intervalTimerSnapshotStore: IntervalTimerSnapshotStore;

	private readonly taskLineController: TaskLineController;

	private readonly audioOutput = new AudioOutput();

	private readonly focusTickSound = new FocusTickSound(this.audioOutput);

	private readonly focusBgm = new FocusBgm(this.audioOutput);

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		this.keyValueStore = new KeyValueStore(manifest.id);
		this.intervalTimerSnapshotStore = new IntervalTimerSnapshotStore(
			this.keyValueStore,
		);
		const callbacks = {
			notify: (message: string) => new Notice(message),
			renderIcon: setIcon,
		};
		this.timerDisplay = Platform.isMobile
			? new FloatingTimer(this.app, callbacks)
			: new StatusBar(this.addStatusBarItem(), callbacks);
		this.taskLineController = new TaskLineController(
			this.app.workspace,
			new TaskTracker(this.app, this.keyValueStore),
			this.timerDisplay,
		);
	}

	public override async onload(): Promise<void> {
		await this.loadSettings();
		this.notifier = createNotifier(this.currentSettings.notificationStyle);
		this.setupIntervalTimer();
		this.settingStore.subscribe((previous, next) => {
			this.handleSettingsChange(previous, next);
		});
		this.settingStore.subscribe((_previous, next) => {
			void this.saveData(next);
		});
		this.taskLineController.setup(this, this.intervalTimer);
		registerCommands(this, this.intervalTimer);
		this.addSettingTab(new SettingTab(this.app, this));

		this.timerDisplay.enableClick(this.intervalTimer);
		this.registerDomEvent(window, "focus", () => {
			this.notifier.clearNotification();
		});
	}

	public override onunload(): void {
		FlashOverlay.dispose();
		this.focusBgm.dispose();
		this.audioOutput.dispose();
		this.timerDisplay.dispose();
		this.intervalTimer.dispose();
	}

	public updateSetting(
		key: keyof PluginSetting,
		value: unknown,
	):
		| ParsePositiveIntegerResult
		| Result<Minutes, "out_of_range_minutes">
		| ParseNotificationStyleResult
		| ParseBooleanResult
		| ParseFocusTickSoundVolumeResult
		| ParseFocusBgmTypeResult
		| ParseFocusBgmVolumeResult {
		switch (key) {
			case "focusIntervalDuration":
			case "shortBreakDuration":
			case "longBreakDuration": {
				const parsed = parsePositiveInteger(value);
				if (!parsed.ok) return parsed;
				if (!isMinutes(parsed.value)) {
					return err("out_of_range_minutes");
				}

				this.settingStore.update({ [key]: parsed.value });

				return parsed;
			}
			case "longBreakAfter": {
				const parsed = parsePositiveInteger(value);
				if (!parsed.ok) return parsed;

				this.settingStore.update({ longBreakAfter: parsed.value });

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
				this.settingStore.update({ notificationStyle: parsed.value });

				return parsed;
			}
			case "flashOverlayEnabled": {
				const parsed: ParseBooleanResult =
					typeof value === "boolean"
						? ok(value)
						: err("invalid_boolean");
				if (!parsed.ok) return parsed;

				if (!parsed.value) {
					FlashOverlay.getInstance().hide();
				}
				this.settingStore.update({ flashOverlayEnabled: parsed.value });

				return parsed;
			}
			case "focusTickSoundVolume": {
				const parsed: ParseFocusTickSoundVolumeResult =
					isFocusTickSoundVolume(value)
						? ok(value)
						: err("invalid_focus_tick_sound_volume");
				if (!parsed.ok) return parsed;

				this.settingStore.update({
					focusTickSoundVolume: parsed.value,
				});

				return parsed;
			}
			case "focusBgmType": {
				const parsed: ParseFocusBgmTypeResult = isFocusBgmType(value)
					? ok(value)
					: err("invalid_focus_bgm_type");
				if (!parsed.ok) return parsed;

				this.settingStore.update({ focusBgmType: parsed.value });

				return parsed;
			}
			case "focusBgmVolume": {
				const parsed: ParseFocusBgmVolumeResult = isFocusBgmVolume(
					value,
				)
					? ok(value)
					: err("invalid_focus_bgm_volume");
				if (!parsed.ok) return parsed;

				this.settingStore.update({ focusBgmVolume: parsed.value });

				return parsed;
			}
		}
	}

	private readonly settingsReloads: readonly SettingsReload[] = [
		{
			keys: [
				"focusIntervalDuration",
				"shortBreakDuration",
				"longBreakDuration",
				"longBreakAfter",
			],
			reload: (next) => {
				this.intervalTimer.updateSettings({
					focusIntervalDuration: next.focusIntervalDuration,
					shortBreakDuration: next.shortBreakDuration,
					longBreakDuration: next.longBreakDuration,
					longBreakAfter: next.longBreakAfter,
				});
			},
		},
		{
			keys: ["longBreakAfter"],
			reload: (next) => {
				this.timerDisplay.updateLongBreakAfter(next.longBreakAfter);
			},
		},
		{
			keys: ["focusTickSoundVolume"],
			reload: (next) => {
				this.focusTickSound.play(next.focusTickSoundVolume);
			},
		},
		{
			keys: ["focusBgmType", "focusBgmVolume"],
			reload: () => {
				this.updateFocusBgmPlayback(this.intervalTimer.status, {
					previewWhenIdle: true,
				});
			},
		},
	];

	private handleSettingsChange(
		previous: PluginSetting,
		next: PluginSetting,
	): void {
		this.settingsReloads.forEach(({ keys, reload }) => {
			if (keys.some((key) => previous[key] !== next[key])) {
				reload(next);
			}
		});
	}

	private updateFocusBgmPlayback(
		{ timerState, snapshot }: IntervalTimerStatus,
		options?: { previewWhenIdle: boolean },
	): void {
		const { focusBgmType, focusBgmVolume } = this.currentSettings;

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
				this.currentSettings.longBreakAfter,
			);
			if (timerState === "initialized") {
				this.taskLineController.untrackCurrentTask();
			}
		};
		const onNotify = (message: string, context: NotifierContext) => {
			if (this.currentSettings.flashOverlayEnabled) {
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
				this.taskLineController.trackCurrentTaskFromActiveLine();
			}
		};
		const onFocusIntervalEnded = () => {
			void this.taskLineController.completeFocusInterval();
		};
		const snapshot = this.intervalTimerSnapshotStore.load();

		this.intervalTimer = new IntervalTimer({
			focusIntervalDuration: this.currentSettings.focusIntervalDuration,
			shortBreakDuration: this.currentSettings.shortBreakDuration,
			longBreakDuration: this.currentSettings.longBreakDuration,
			longBreakAfter: this.currentSettings.longBreakAfter,
			resetTime: { hours: 0, minutes: 0 }, // TODO: Maybe make this configurable on setting tab?
		});
		this.intervalTimer.subscribe((event) => {
			switch (event.type) {
				case "state-changed":
					updateTimerState(event);
					this.updateFocusBgmPlayback(event);
					if (
						this.currentSettings.focusTickSoundVolume > 0 &&
						event.snapshot.state === "focus" &&
						event.timerState === "running"
					) {
						this.focusTickSound.play(
							this.currentSettings.focusTickSoundVolume,
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
				case "timer-paused":
				case "timer-reset":
				case "interval-skipped":
					// no-op
					break;
			}
		});
		updateTimerState(this.intervalTimer.status);
		if (snapshot !== null) {
			this.intervalTimer.applySnapshot(snapshot);
		}
		this.intervalTimer.enableAutoReset();
	}

	private async loadSettings(): Promise<void> {
		this.settingStore.update(parsePluginSetting(await this.loadData()));
	}
}
