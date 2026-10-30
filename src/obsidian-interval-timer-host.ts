import { match } from "ts-pattern";
import { AudioOutput } from "./audio-output";
import { FlashOverlay } from "./flash-overlay";
import { FocusBgm } from "./focus-bgm";
import { FocusTickSound } from "./focus-tick-sound";
import { TimeUpSound } from "./time-up-sound";
import {
	IntervalTimer,
	isFocusRunning,
	type IntervalTimerEvent,
	type IntervalTimerState,
	type IntervalTimerStatus,
} from "./interval-timer";
import type { IntervalTimerSnapshotStore } from "./interval-timer-snapshot";
import type { EventStore } from "./event-store";
import { IntervalTimerEventRecord } from "./interval-timer-event-record";
import { createNotifier } from "./obsidian-notification";
import type { PluginSettingStore } from "./obsidian-plugin-setting";
import type { TaskLineController } from "./obsidian-task-line-controller";
import type { TimerDisplay } from "./timer-display";

type IntervalTimerHostOptions = {
	readonly settingStore: PluginSettingStore;
	readonly timerDisplay: TimerDisplay;
	readonly snapshotStore: IntervalTimerSnapshotStore;
	readonly eventStore: EventStore<IntervalTimerEventRecord>;
	readonly taskLineController: TaskLineController;
};

const notificationMessage = (state: IntervalTimerState): string =>
	match(state)
		.with("focus", () => "⏰  Now it's time to focus")
		.with("shortBreak", () => "☕️  Time for a short break")
		.with("longBreak", () => "🏖️  Time for a long break")
		.exhaustive();

export class IntervalTimerHost {
	private readonly settingStore;

	private readonly timerDisplay;

	private readonly snapshotStore;

	private readonly eventStore;

	private readonly taskLineController;

	private readonly intervalTimer: IntervalTimer;

	private notifier;

	private readonly audioOutput = new AudioOutput();

	private readonly focusTickSound = new FocusTickSound(this.audioOutput);

	private readonly focusBgm = new FocusBgm(this.audioOutput);

	private readonly timeUpSound = new TimeUpSound(this.audioOutput);

	private readonly flashOverlay = new FlashOverlay({
		onClick: () => {
			if (this.intervalTimer.predictTouch() === "next") {
				this.intervalTimer.touch();
			}
		},
	});

	private readonly unsubscribeSettings;

	constructor({
		settingStore,
		timerDisplay,
		snapshotStore,
		eventStore,
		taskLineController,
	}: IntervalTimerHostOptions) {
		this.settingStore = settingStore;
		this.timerDisplay = timerDisplay;
		this.snapshotStore = snapshotStore;
		this.eventStore = eventStore;
		this.taskLineController = taskLineController;
		const settings = settingStore.state;
		this.notifier = createNotifier(settings.notificationStyle);
		this.notifier.enableAutoClear();
		this.intervalTimer = new IntervalTimer({
			focusIntervalDuration: settings.focusIntervalDuration,
			shortBreakDuration: settings.shortBreakDuration,
			longBreakDuration: settings.longBreakDuration,
			longBreakAfter: settings.longBreakAfter,
			intervalCompletionBehavior: settings.intervalCompletionBehavior,
			resetTime: { hours: 0, minutes: 0 }, // TODO: Maybe make this configurable on setting tab?
		});
		this.unsubscribeSettings = this.subscribeSettingsReloads();
	}

	public get timer(): IntervalTimer {
		return this.intervalTimer;
	}

	public initialize(): void {
		const snapshot = this.snapshotStore.load();
		this.intervalTimer.subscribe((event) => {
			this.onTimerEvent(event);
		});
		this.updateTimerState(this.intervalTimer.status);
		this.taskLineController.untrackCurrentTask();
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

	private subscribeSettingsReloads(): () => void {
		return this.settingStore.subscribeReloads((on) => [
			on(["notificationStyle"], (next) => {
				this.notifier.dispose();
				this.notifier = createNotifier(next.notificationStyle);
				this.notifier.enableAutoClear();
			}),
			on(["flashOverlayEnabled"], (next) => {
				if (!next.flashOverlayEnabled) {
					this.flashOverlay.hide();
				}
			}),
			on(
				[
					"focusIntervalDuration",
					"shortBreakDuration",
					"longBreakDuration",
					"longBreakAfter",
					"intervalCompletionBehavior",
				],
				(next) => {
					this.intervalTimer.updateSettings(next);
					this.snapshotStore.save(this.intervalTimer.status.snapshot);
				},
			),
			on(["longBreakAfter"], (next) => {
				this.timerDisplay.updateLongBreakAfter(next.longBreakAfter);
			}),
			on(["focusTickSoundVolume"], (next) => {
				this.focusTickSound.play(next.focusTickSoundVolume);
			}),
			on(["timeUpSoundVolume"], (next) => {
				this.timeUpSound.play(next.timeUpSoundVolume);
			}),
			on(["focusBgmType", "focusBgmVolume"], (next) => {
				if (isFocusRunning(this.intervalTimer.status)) {
					this.focusBgm.play(next.focusBgmType, next.focusBgmVolume);
				} else {
					this.focusBgm.preview(
						next.focusBgmType,
						next.focusBgmVolume,
					);
				}
			}),
		]);
	}

	private onTimerEvent(event: IntervalTimerEvent): void {
		match(event)
			.with({ type: "state-changed" }, (stateChanged) => {
				this.updateTimerState(stateChanged);

				const { focusBgmType, focusBgmVolume, focusTickSoundVolume } =
					this.settingStore.state;
				if (isFocusRunning(stateChanged)) {
					this.focusBgm.play(focusBgmType, focusBgmVolume);
				} else {
					this.focusBgm.stop();
				}
				if (isFocusRunning(stateChanged) && focusTickSoundVolume > 0) {
					this.focusTickSound.play(focusTickSoundVolume);
				}
			})
			.with({ type: "timer-started" }, (started) => {
				if (
					started.mode === "fresh" &&
					started.snapshot.state === "focus"
				) {
					this.taskLineController.trackCurrentTaskFromActiveLine();
				}
			})
			.with({ type: "focus-interval-ended" }, () => {
				void this.taskLineController.completeFocusInterval();
			})
			.with({ type: "interval-completed" }, (completed) => {
				if (this.settingStore.state.flashOverlayEnabled) {
					this.flashOverlay.show(
						match(completed.to)
							.with("focus", () => ({ r: 255, g: 100, b: 100 }))
							.with("shortBreak", "longBreak", () => ({
								r: 100,
								g: 255,
								b: 100,
							}))
							.exhaustive(),
					);
				}
				this.notifier.notify(notificationMessage(completed.to));
			})
			.with({ type: "timer-completed" }, () => {
				this.timeUpSound.play(
					this.settingStore.state.timeUpSoundVolume,
				);
			})
			.with(
				{ type: "timer-paused" },
				{ type: "timer-reset" },
				{ type: "intervals-reset" },
				{ type: "timer-retimed" },
				{ type: "interval-skipped" },
				() => {
					// no-op
				},
			)
			.exhaustive();

		const record = IntervalTimerEventRecord.from(
			event,
			this.taskLineController.trackedTask,
		);
		if (record !== null) {
			this.eventStore.record(record);
		}

		if (
			event.type === "timer-reset" ||
			event.type === "intervals-reset" ||
			event.type === "timer-retimed" ||
			event.type === "interval-completed" ||
			event.type === "interval-skipped"
		) {
			this.taskLineController.untrackCurrentTask();
		}
	}

	private updateTimerState({
		timerState,
		snapshot,
	}: IntervalTimerStatus): void {
		this.snapshotStore.save(snapshot);
		this.timerDisplay.update(
			snapshot.focusIntervals,
			snapshot,
			snapshot.state,
			timerState,
			this.settingStore.state.longBreakAfter,
		);
	}
}
