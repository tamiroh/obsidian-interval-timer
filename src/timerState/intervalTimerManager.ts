import { Notice } from "obsidian";
import { CountdownTimer } from "../timer/countdownTimer";
import { Time } from "../time/time";
import { format } from "../utils/time";
import { Setting } from "../setting/types";

export class IntervalTimerManager {
	private type: "focus" | "break";

	private timer: CountdownTimer;

	private readonly onIntervalCreated: (intervalId: number) => void;

	private totalFocusIntervals: number;

	private setFocusIntervals: number;

	private readonly setText: (text: string) => void;

	private readonly settings: Setting;

	constructor(
		setText: (text: string) => void,
		settings: Setting,
		onIntervalCreated: (intervalId: number) => void
	) {
		this.setText = setText;
		this.settings = settings;
		this.onIntervalCreated = onIntervalCreated;
		this.timer = new CountdownTimer(
			new Time(settings.focusIntervalDuration, 0),
			(time: Time) => setText(`(Running) ${format(time)}`),
			this.onPause,
			this.onComplete
		);
		this.type = "focus";
		this.totalFocusIntervals = 0;
		this.setFocusIntervals = 0;
	}

	public startTimer = () => {
		if (this.timer == null) {
			const startTime = new Time(this.settings.focusIntervalDuration, 0);
			const timer = new CountdownTimer(
				startTime,
				(time: Time) => this.setText(`(Running) ${format(time)}`),
				this.onPause,
				this.onComplete
			);
			this.type = "focus";
			this.timer = timer;
		}
		this.setText(
			`(Running) ${format(
				new Time(this.settings.focusIntervalDuration, 0)
			)}`
		);
		this.timer.start();
		const intervalId = this.timer.getIntervalId();
		if (intervalId != null) {
			this.onIntervalCreated(intervalId);
		}
	};

	public pauseTimer = () => {
		this.timer.pause();
	};

	public resetTimer = () => {
		const result = this.timer.reset();
		if (result.type === "succeeded") {
			this.setText(`(Initialized) ${format(result.resetTo)}`);
		}
	};

	private onComplete = () => {
		new Notice("completed!");
		this.setText(`(Completed) 00:00`);
	};

	private onPause = (current: Time) => {
		this.setText(`(Paused) ${format(current)}`);
	};
}
