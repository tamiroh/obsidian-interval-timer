import { PauseResult, ResetResult, StartResult, TimerState } from "./types";
import { Seconds, Time, TimeState } from "../types/time";

export class CountdownTimer {
	private state: TimerState;

	private readonly callback: (time: Time) => void;

	private readonly onPause: ((current: Time) => void) | undefined;

	private readonly onComplete: (() => void) | undefined;

	private readonly initialTime: Time;

	constructor(
		initialTime: Time,
		callback: (time: Time) => void,
		onPause?: (current: Time) => void,
		onComplete?: () => void,
	) {
		this.onPause = onPause;
		this.onComplete = onComplete;
		this.initialTime = {
			minutes: initialTime.minutes,
			seconds: initialTime.seconds,
		};
		this.state = { type: "initialized", currentTime: initialTime };
		this.callback = callback;
	}

	public start(): StartResult {
		if (this.state.type === "completed" || this.state.type === "running") {
			return { type: "failed" };
		}

		const intervalId = window.setInterval(() => {
			if (this.state.type !== "running") {
				window.clearInterval(intervalId);
				return;
			}

			const result = this.subtractSecond(this.state.currentTime);

			if (result.type === "subtracted") {
				this.state.currentTime = result.time;
				this.callback(this.state.currentTime);
			}
			if (result.type === "exceeded") {
				window.clearInterval(intervalId);
				this.state = { type: "completed" };
				this.onComplete?.();
			}
		}, 1000);

		this.state = {
			type: "running",
			intervalId,
			currentTime: this.state.currentTime,
		};

		return { type: "succeeded" };
	}

	public pause(): PauseResult {
		if (this.state.type !== "running") return { type: "failed" };

		window.clearInterval(this.state.intervalId);
		this.state = {
			type: "paused",
			currentTime: this.state.currentTime,
		};
		this.onPause?.({
			minutes: this.state.currentTime.minutes,
			seconds: this.state.currentTime.seconds,
		});

		return { type: "succeeded" };
	}

	public reset(): ResetResult {
		if (this.state.type === "running") {
			window.clearInterval(this.state.intervalId);
		}
		this.state = {
			type: "initialized",
			currentTime: this.initialTime,
		};
		return {
			type: "succeeded",
			resetTo: {
				minutes: this.initialTime.minutes,
				seconds: this.initialTime.seconds,
			},
		};
	}

	public getIntervalId(): number | undefined {
		return this.state.type === "running"
			? this.state.intervalId
			: undefined;
	}

	// eslint-disable-next-line class-methods-use-this
	private subtractSecond({ minutes, seconds }: Time): TimeState {
		if (seconds === 0) {
			if (minutes === 0) return { type: "exceeded" };
			return {
				type: "subtracted",
				time: { minutes: minutes - 1, seconds: 59 },
			};
		}
		return {
			type: "subtracted",
			time: { minutes, seconds: (seconds - 1) as Seconds },
		};
	}
}
