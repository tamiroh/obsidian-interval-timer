import { Time } from "../time/time";
import { PauseResult, StartResult, TimerState } from "./types";

export class CountdownTimer {
	private state: TimerState;

	private readonly callback: (time: Time) => void;

	constructor(initialTime: Time, callback: (time: Time) => void) {
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

	public getIntervalId(): number | undefined {
		return this.state.type === "running"
			? this.state.intervalId
			: undefined;
	}
}
