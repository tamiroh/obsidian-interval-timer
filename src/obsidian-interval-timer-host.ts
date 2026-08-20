import { match } from "ts-pattern";
import { AudioOutput } from "./audio-output";
import { FlashOverlay } from "./flash-overlay";
import { FocusBgm } from "./focus-bgm";
import { FocusTickSound } from "./focus-tick-sound";
import {
	IntervalTimer,
	type IntervalTimerEvent,
	type IntervalTimerStatus,
	type NotifierContext,
} from "./interval-timer";
import type { IntervalTimerSnapshotStore } from "./interval-timer-snapshot";
import { createNotifier } from "./obsidian-notification";
import type {
	PluginSetting,
	PluginSettingStore,
} from "./obsidian-plugin-setting";
import type { TaskLineController } from "./obsidian-task-line-controller";
import type { TimerDisplay } from "./timer-display";

type IntervalTimerHostOptions = {
	readonly settingStore: PluginSettingStore;
	readonly timerDisplay: TimerDisplay;
	readonly snapshotStore: IntervalTimerSnapshotStore;
	readonly taskLineController: TaskLineController;
};

type SettingsReload = {
	readonly keys: readonly (keyof PluginSetting)[];
	readonly reload: (next: Readonly<PluginSetting>) => void;
};

export class IntervalTimerHost {
	private currentSettings;

	private readonly timerDisplay;

	private readonly snapshotStore;

	private readonly taskLineController;

	private intervalTimer!: IntervalTimer;

	private notifier;

	private readonly audioOutput = new AudioOutput();

	private readonly focusTickSound = new FocusTickSound(this.audioOutput);

	private readonly focusBgm = new FocusBgm(this.audioOutput);

	private readonly flashOverlay = new FlashOverlay();

	private readonly settingsReloads;

	private readonly unsubscribeSettings;

	constructor({
		settingStore,
		timerDisplay,
		snapshotStore,
		taskLineController,
	}: IntervalTimerHostOptions) {
		this.currentSettings = settingStore.state;
		this.timerDisplay = timerDisplay;
		this.snapshotStore = snapshotStore;
		this.taskLineController = taskLineController;
		this.notifier = createNotifier(this.currentSettings.notificationStyle);
		this.notifier.enableAutoClear();
		this.settingsReloads = this.settingsReloadsDefinition();
		this.unsubscribeSettings = settingStore.subscribe((previous, next) => {
			this.currentSettings = next;
			this.settingsReloads.forEach(({ keys, reload }) => {
				if (keys.some((key) => previous[key] !== next[key])) {
					reload(next);
				}
			});
		});
	}

	public get timer(): IntervalTimer {
		return this.intervalTimer;
	}

	public initialize(): void {
		const snapshot = this.snapshotStore.load();
		this.intervalTimer = new IntervalTimer({
			focusIntervalDuration: this.currentSettings.focusIntervalDuration,
			shortBreakDuration: this.currentSettings.shortBreakDuration,
			longBreakDuration: this.currentSettings.longBreakDuration,
			longBreakAfter: this.currentSettings.longBreakAfter,
			resetTime: { hours: 0, minutes: 0 }, // TODO: Maybe make this configurable on setting tab?
		});
		this.intervalTimer.subscribe((event) => {
			this.onTimerEvent(event);
		});
		this.updateTimerState(this.intervalTimer.status);
		if (snapshot !== null) {
			this.intervalTimer.applySnapshot(snapshot);
		}
		this.intervalTimer.enableAutoReset();
	}

	public dispose(): void {
		this.unsubscribeSettings();
		this.notifier.dispose();
		this.flashOverlay.dispose();
		this.focusBgm.dispose();
		this.audioOutput.dispose();
		this.intervalTimer.dispose();
	}

	private settingsReloadsDefinition(): readonly SettingsReload[] {
		return [
			{
				keys: ["notificationStyle"],
				reload: (next) => {
					this.notifier.dispose();
					this.notifier = createNotifier(next.notificationStyle);
					this.notifier.enableAutoClear();
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
				reload: (next) => {
					const { timerState, snapshot } = this.intervalTimer.status;
					if (
						snapshot.state === "focus" &&
						timerState === "running"
					) {
						this.focusBgm.play(
							next.focusBgmType,
							next.focusBgmVolume,
						);
					} else {
						this.focusBgm.preview(
							next.focusBgmType,
							next.focusBgmVolume,
						);
					}
				},
			},
		];
	}

	private onTimerEvent(event: IntervalTimerEvent): void {
		switch (event.type) {
			case "state-changed": {
				this.updateTimerState(event);

				const isFocusRunning =
					event.snapshot.state === "focus" &&
					event.timerState === "running";
				const { focusBgmType, focusBgmVolume } = this.currentSettings;
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
				if (
					event.mode === "fresh" &&
					event.snapshot.state === "focus"
				) {
					this.taskLineController.trackCurrentTaskFromActiveLine();
				}
				break;
			case "focus-interval-ended":
				void this.taskLineController.completeFocusInterval();
				break;
			case "interval-completed":
				this.notify(event.notificationMessage, { state: event.to });
				break;
			case "timer-paused":
			case "timer-reset":
			case "interval-skipped":
				// no-op
				break;
		}
	}

	private updateTimerState({
		timerState,
		snapshot,
	}: IntervalTimerStatus): void {
		this.snapshotStore.save(
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
	}

	private notify(message: string, context: NotifierContext): void {
		if (this.currentSettings.flashOverlayEnabled) {
			this.flashOverlay.show(
				match(context.state)
					.with("focus", () => ({ r: 255, g: 100, b: 100 }))
					.with("shortBreak", "longBreak", () => ({
						r: 100,
						g: 255,
						b: 100,
					}))
					.exhaustive(),
			);
		}
		this.notifier.notify(message);
	}
}
