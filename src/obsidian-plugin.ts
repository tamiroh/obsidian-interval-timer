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
import { Notifier } from "./notification";
import { createNotifier } from "./obsidian-notification";
import { FlashOverlay } from "./flash-overlay";
import { IntervalTimerSnapshotStore } from "./interval-timer-snapshot";
import { TaskTracker } from "./obsidian-task-tracker";
import { TaskLineController } from "./obsidian-task-line-controller";
import {
	defaultPluginSetting,
	parsePluginSetting,
	PluginSetting,
	type PluginSettingUpdateResult,
	PluginSettingStore,
} from "./obsidian-plugin-setting";
import { FocusTickSound } from "./focus-tick-sound";
import { FocusBgm } from "./focus-bgm";
import { AudioOutput } from "./audio-output";
import { registerCommands } from "./obsidian-plugin-commands";
import type { TimerDisplay } from "./timer-display";

export type { PluginSetting } from "./obsidian-plugin-setting";

type SettingsReload = {
	readonly keys: readonly (keyof PluginSetting)[];
	readonly reload: (next: PluginSetting) => void;
};

export class Plugin extends BasePlugin {
	private readonly settingStore: PluginSettingStore = new PluginSettingStore(
		defaultPluginSetting,
	);

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

	private readonly flashOverlay = new FlashOverlay();

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
			this.settingsReloads().forEach(({ keys, reload }) => {
				if (keys.some((key) => previous[key] !== next[key])) {
					reload(next);
				}
			});
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
		this.flashOverlay.dispose();
		this.focusBgm.dispose();
		this.audioOutput.dispose();
		this.timerDisplay.dispose();
		this.intervalTimer.dispose();
	}

	public updateSetting(
		key: keyof PluginSetting,
		value: unknown,
	): PluginSettingUpdateResult {
		return this.settingStore.update(key, value);
	}

	private settingsReloads(): readonly SettingsReload[] {
		return [
			{
				keys: ["notificationStyle"],
				reload: (next) => {
					this.notifier.clearNotification();
					this.notifier = createNotifier(next.notificationStyle);
				},
			},
			{
				keys: ["flashOverlayEnabled"],
				reload: (next) => {
					if (!next.flashOverlayEnabled) {
						this.flashOverlay.hide();
					}
				},
			},
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
					const { focusBgmType, focusBgmVolume } =
						this.currentSettings;
					const { timerState, snapshot } = this.intervalTimer.status;

					if (
						snapshot.state === "focus" &&
						timerState === "running"
					) {
						this.focusBgm.play(focusBgmType, focusBgmVolume);
					} else {
						this.focusBgm.preview(focusBgmType, focusBgmVolume);
					}
				},
			},
		];
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
				this.flashOverlay.show(overlayColor);
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
				case "state-changed": {
					updateTimerState(event);

					const isFocusRunning =
						event.snapshot.state === "focus" &&
						event.timerState === "running";
					const { focusBgmType, focusBgmVolume } =
						this.currentSettings;
					if (isFocusRunning) {
						this.focusBgm.play(focusBgmType, focusBgmVolume);
					} else {
						this.focusBgm.stop();
					}
					if (
						isFocusRunning &&
						this.currentSettings.focusTickSoundVolume > 0
					) {
						this.focusTickSound.play(
							this.currentSettings.focusTickSoundVolume,
						);
					}
					break;
				}
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
