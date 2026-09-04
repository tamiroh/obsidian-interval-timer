import { fc, test } from "@fast-check/vitest";
import { afterEach, beforeEach, describe, expect, vi } from "vitest";
import {
	IntervalTimer,
	type IntervalTimerSetting,
	type IntervalTimerState,
	type TouchAction,
} from "./interval-timer";

//
// Settings
//

const baseSettings: IntervalTimerSetting = {
	focusIntervalDuration: 25,
	shortBreakDuration: 5,
	longBreakDuration: 15,
	longBreakAfter: 4,
	resetTime: { hours: 0, minutes: 0 },
};

const durationOf = (state: IntervalTimerState): number =>
	({
		focus: baseSettings.focusIntervalDuration,
		shortBreak: baseSettings.shortBreakDuration,
		longBreak: baseSettings.longBreakDuration,
	})[state];

//
// The model
//

type RunStatus = "initialized" | "running" | "paused";

type Model = {
	state: IntervalTimerState;
	total: number;
	set: number;
	longBreakAfter: number;
	currentMinutes: number;
	run: RunStatus;
};

type Action =
	| { type: "start" }
	| { type: "pause" }
	| { type: "reset" }
	| { type: "skip" }
	| { type: "complete" }
	| { type: "touch" }
	| { type: "retime"; minutes: number }
	| { type: "setLongBreakAfter"; value: number };

//
// The spec: how each action is expected to change the model
//

const predictedTouch = (model: Model): TouchAction => {
	if (model.run === "running") {
		return model.state === "focus" ? "reset" : "skip";
	}
	return model.run === "paused" ? "resume" : "start";
};

const enterNextInterval = (model: Model): void => {
	if (model.state === "focus") {
		model.total += 1;
		model.set += 1;
		if (model.set >= model.longBreakAfter) {
			model.set = 0;
			model.state = "longBreak";
		} else {
			model.state = "shortBreak";
		}
	} else {
		model.state = "focus";
	}
	model.currentMinutes = durationOf(model.state);
	model.run = "initialized";
};

const applySpec = (model: Model, action: Action): void => {
	switch (action.type) {
		case "start":
			if (model.run !== "running") {
				model.run = "running";
			}
			return;
		case "pause":
			if (model.run === "running") {
				model.run = "paused";
			}
			return;
		case "reset":
			model.run = "initialized";
			return;
		case "skip":
		case "complete":
			enterNextInterval(model);
			return;
		case "touch": {
			const predicted = predictedTouch(model);
			if (predicted === "reset") {
				applySpec(model, { type: "reset" });
			} else if (predicted === "skip") {
				applySpec(model, { type: "skip" });
			} else {
				applySpec(model, { type: "start" });
			}
			return;
		}
		case "retime":
			if (model.run === "running") {
				return; // rejected, model unchanged
			}
			model.run = "initialized";
			model.currentMinutes = action.minutes;
			return;
		case "setLongBreakAfter":
			// Takes effect only at the next interval boundary.
			model.longBreakAfter = action.value;
			return;
	}
};

//
// The invariants: what must agree between the model and the real timer
//

const assertInSync = (model: Model, timer: IntervalTimer): void => {
	const { snapshot } = timer.status;
	expect(timer.state).toBe(model.state);
	expect(snapshot.focusIntervals).toEqual({
		total: model.total,
		set: model.set,
	});
	expect(snapshot.focusIntervals.total).toBeGreaterThanOrEqual(
		snapshot.focusIntervals.set,
	);
	expect(timer.canStart).toBe(model.run !== "running");
	expect(timer.canPause).toBe(model.run === "running");
};

//
// The adapter: applying an action to the real timer
//

const runAction = (
	action: Action,
	model: Model,
	timer: IntervalTimer,
): void => {
	switch (action.type) {
		case "start":
			timer.start();
			return;
		case "pause":
			timer.pause();
			return;
		case "reset":
			timer.reset();
			return;
		case "skip":
			timer.skipInterval();
			return;
		case "complete":
			vi.advanceTimersByTime(model.currentMinutes * 60_000 + 1_000);
			return;
		case "touch":
			expect(timer.predictTouch()).toBe(predictedTouch(model));
			timer.touch();
			return;
		case "retime":
			expect(timer.retime(action.minutes)).toEqual(
				model.run === "running"
					? { ok: false, reason: "timer_running" }
					: { ok: true, value: undefined },
			);
			return;
		case "setLongBreakAfter":
			timer.updateSettings({ longBreakAfter: action.value });
			return;
	}
};

const stringifyAction = (action: Action): string => {
	switch (action.type) {
		case "start":
		case "pause":
		case "reset":
		case "skip":
		case "complete":
		case "touch":
			return action.type;
		case "retime":
			return `Retime(${action.minutes})`;
		case "setLongBreakAfter":
			return `SetLongBreakAfter(${action.value})`;
	}
};

const command = (action: Action): fc.Command<Model, IntervalTimer> => ({
	check: (model) => action.type !== "complete" || model.run === "running",
	run(model, timer) {
		runAction(action, model, timer);
		applySpec(model, action);
		assertInSync(model, timer);
	},
	toString: () => stringifyAction(action),
});

//
// Action generators
//

const actionArbitrary: fc.Arbitrary<Action> = fc.oneof(
	fc.constant<Action>({ type: "start" }),
	fc.constant<Action>({ type: "pause" }),
	fc.constant<Action>({ type: "reset" }),
	fc.constant<Action>({ type: "skip" }),
	fc.constant<Action>({ type: "complete" }),
	fc.constant<Action>({ type: "touch" }),
	fc
		.integer({ min: 1, max: 90 })
		.map<Action>((minutes) => ({ type: "retime", minutes })),
	fc
		.integer({ min: 1, max: 6 })
		.map<Action>((value) => ({ type: "setLongBreakAfter", value })),
);

const commandArbitrary = fc.commands<Model, IntervalTimer>(
	[actionArbitrary.map(command)],
	{ size: "+1" },
);

//
// The property
//

describe("IntervalTimer model", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test.prop([commandArbitrary], { numRuns: 200 })(
		"stays in sync with the model and round-trips through a snapshot",
		(commands) => {
			const timer = new IntervalTimer(baseSettings);
			const model: Model = {
				state: "focus",
				total: 0,
				set: 0,
				longBreakAfter: baseSettings.longBreakAfter,
				currentMinutes: baseSettings.focusIntervalDuration,
				run: "initialized",
			};

			try {
				fc.modelRun(() => ({ model, real: timer }), commands);

				const restored = new IntervalTimer(baseSettings);
				restored.applySnapshot(timer.status.snapshot);
				expect(restored.status.snapshot).toEqual(timer.status.snapshot);
				restored.dispose();
			} finally {
				timer.dispose();
			}
		},
		20_000,
	);
});
