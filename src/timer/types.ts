import { Time } from "../types/time";

export const timerTypes = [
	"initialized",
	"running",
	"paused",
	"completed",
] as const;

export type TimerType = (typeof timerTypes)[number];

export type TimerState =
	| {
			type: (typeof timerTypes)[0];
			currentTime: Time;
	  }
	| {
			type: (typeof timerTypes)[1];
			currentTime: Time;
			intervalId: number;
	  }
	| {
			type: (typeof timerTypes)[2];
			currentTime: Time;
	  }
	| {
			type: (typeof timerTypes)[3];
	  };

export type PauseResult = { type: "succeeded" } | { type: "failed" };

export type StartResult = { type: "succeeded" } | { type: "failed" };

export type ResetResult =
	| { type: "succeeded"; resetTo: Time }
	| { type: "failed" };
