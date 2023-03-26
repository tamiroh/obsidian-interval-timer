import { Time } from "../time/time";
import { PauseResult, ResetResult, StartResult, TimerState } from "./types";

export class CountdownTimer {
	private state: TimerState;

	private readonly callback: (time: Time) => void;

	private readonly onComplete: (() => void) | undefined;

	private readonly initialTime: Time;

	constructor(
		initialTime: Time,
		callback: (time: Time) => void,
		onComplete?: () => void
	) {
		this.onComplete = onComplete;
		this.initialTime = new Time(initialTime.minutes, initialTime.seconds);
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

			const result = this.state.currentTime.subtractSecond();

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
			resetTo: new Time(
				this.initialTime.minutes,
				this.initialTime.seconds
			),
		};
	}

	public getIntervalId(): number | undefined {
		return this.state.type === "running"
			? this.state.intervalId
			: undefined;
	}
}
