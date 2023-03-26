import { Time } from "../time/time";

export type TimerState =
	| {
			type: "initialized";
			currentTime: Time;
	  }
	| {
			type: "running";
			currentTime: Time;
			intervalId: number;
	  }
	| {
			type: "paused";
			currentTime: Time;
	  }
	| {
			type: "completed";
	  };

export type PauseResult = { type: "succeeded" } | { type: "failed" };

export type StartResult = { type: "succeeded" } | { type: "failed" };

export type ResetResult =
	| { type: "succeeded"; resetTo: Time }
	| { type: "failed" };
