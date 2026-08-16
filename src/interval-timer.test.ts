import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
	IntervalTimer,
	type IntervalTimerEvent,
	IntervalTimerSetting,
} from "./interval-timer";
import { minutesUpperBound } from "./time";
import { clear, last } from "./array";

const stateChangedEvents = (
	events: IntervalTimerEvent[],
): Extract<IntervalTimerEvent, { type: "state-changed" }>[] =>
	events.filter(
		(
			event,
		): event is Extract<IntervalTimerEvent, { type: "state-changed" }> =>
			event.type === "state-changed",
	);

const intervalCompletedEvents = (
	events: IntervalTimerEvent[],
): Extract<IntervalTimerEvent, { type: "interval-completed" }>[] =>
	events.filter(
		(
			event,
		): event is Extract<
			IntervalTimerEvent,
			{ type: "interval-completed" }
		> => event.type === "interval-completed",
	);

describe("IntervalTimer", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Auto reset", () => {
		it("should reset intervals when reset time is passed", () => {
			// Arrange
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0)); // 23:59:00
			const events: IntervalTimerEvent[] = [];
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.enableAutoReset();
			clear(events);

			// Act
			vi.advanceTimersByTime(1000); // Advance to 23:59:01
			vi.advanceTimersByTime(60000); // Advance to 00:00:01 (crosses reset time)

			// Assert
			const changes = stateChangedEvents(events);
			expect(changes).toHaveLength(1);
			expect(changes[0]).toMatchObject({
				timerState: "initialized",
				snapshot: {
					state: "focus",
					minutes: 25,
					seconds: 0,
					focusIntervals: { set: 0, total: 0 },
				},
			});

			intervalTimer.dispose();
		});

		it("should not reset intervals if reset time has not been passed", () => {
			// Arrange
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0)); // 23:59:00
			const events: IntervalTimerEvent[] = [];
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.enableAutoReset();
			clear(events);

			// Act
			vi.advanceTimersByTime(1000); // Advance to 23:59:01
			vi.advanceTimersByTime(1000); // Advance to 23:59:02 (still before reset time)

			// Assert
			expect(stateChangedEvents(events)).toHaveLength(0);

			intervalTimer.dispose();
		});

		it("should reset intervals when crossing reset time right after enableAutoReset", () => {
			// Arrange
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 59, 999)); // just before reset time
			const events: IntervalTimerEvent[] = [];
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.enableAutoReset();
			clear(events);

			// Act
			// Advance 1 second to cross the reset time (now 00:00:00)
			vi.advanceTimersByTime(1000);

			// Assert
			// Should have reset exactly once because we crossed the reset time
			const changes = stateChangedEvents(events);
			expect(changes).toHaveLength(1);
			expect(changes[0]).toMatchObject({
				timerState: "initialized",
				snapshot: {
					state: "focus",
					minutes: 25,
					seconds: 0,
					focusIntervals: { set: 0, total: 0 },
				},
			});

			intervalTimer.dispose();
		});

		it("should not reset intervals after disableAutoReset", () => {
			// Arrange
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0)); // 23:59:00
			const events: IntervalTimerEvent[] = [];
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.enableAutoReset();
			intervalTimer.disableAutoReset();
			clear(events);

			// Act
			vi.advanceTimersByTime(1000); // Advance to 23:59:01
			vi.advanceTimersByTime(60000); // Advance to 00:00:01 (crosses reset time)

			// Assert
			expect(stateChangedEvents(events)).toHaveLength(0);

			intervalTimer.dispose();
		});

		it("should not reset intervals after dispose", () => {
			// Arrange
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0)); // 23:59:00
			const events: IntervalTimerEvent[] = [];
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.enableAutoReset();
			intervalTimer.dispose();
			clear(events);

			// Act
			vi.advanceTimersByTime(1000); // Advance to 23:59:01
			vi.advanceTimersByTime(60000); // Advance to 00:00:01 (crosses reset time)

			// Assert
			expect(stateChangedEvents(events)).toHaveLength(0);
		});
	});

	describe("Basic controls", () => {
		it("should allow starting but not pausing initially", () => {
			// Arrange
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});

			// Act
			const canStart = intervalTimer.canStart;
			const canPause = intervalTimer.canPause;

			// Assert
			expect(canStart).toBe(true);
			expect(canPause).toBe(false);

			intervalTimer.dispose();
		});

		it("should allow pausing but not starting while running", () => {
			// Arrange
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});

			// Act
			intervalTimer.start();

			// Assert
			expect(intervalTimer.canStart).toBe(false);
			expect(intervalTimer.canPause).toBe(true);

			intervalTimer.dispose();
		});

		it("should allow starting but not pausing while paused", () => {
			// Arrange
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});
			intervalTimer.start();

			// Act
			intervalTimer.pause();

			// Assert
			expect(intervalTimer.canStart).toBe(true);
			expect(intervalTimer.canPause).toBe(false);

			intervalTimer.dispose();
		});

		it("should apply updated durations from the next interval", () => {
			const events: IntervalTimerEvent[] = [];
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});
			intervalTimer.subscribe((event) => events.push(event));
			clear(events);

			intervalTimer.updateSettings({ shortBreakDuration: 10 });
			intervalTimer.skipInterval();

			expect(last(stateChangedEvents(events))).toMatchObject({
				timerState: "initialized",
				snapshot: {
					state: "shortBreak",
					minutes: 10,
					seconds: 0,
					focusIntervals: { set: 1, total: 1 },
				},
			});

			intervalTimer.dispose();
		});

		it("should not change the duration of the current interval", () => {
			const events: IntervalTimerEvent[] = [];
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});
			intervalTimer.subscribe((event) => events.push(event));
			clear(events);

			intervalTimer.updateSettings({ focusIntervalDuration: 30 });
			intervalTimer.start();
			vi.advanceTimersByTime(1000);

			expect(last(stateChangedEvents(events))).toMatchObject({
				timerState: "running",
				snapshot: {
					state: "focus",
					minutes: 24,
					seconds: 59,
					focusIntervals: { set: 0, total: 0 },
				},
			});

			intervalTimer.dispose();
		});

		it("should start a long break after lowering longBreakAfter below the current set count", () => {
			const events: IntervalTimerEvent[] = [];
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: 25,
				seconds: 0,
				focusIntervals: { total: 3, set: 3 },
			});
			clear(events);

			intervalTimer.updateSettings({ longBreakAfter: 2 });
			intervalTimer.skipInterval();

			expect(last(stateChangedEvents(events))).toMatchObject({
				timerState: "initialized",
				snapshot: {
					state: "longBreak",
					minutes: 15,
					seconds: 0,
					focusIntervals: { set: 0, total: 4 },
				},
			});

			intervalTimer.dispose();
		});

		it("should enter running state when started", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			clear(events);

			// Act
			intervalTimer.start();

			// Assert
			const changes = stateChangedEvents(events);
			expect(changes).toHaveLength(1);
			expect(changes[0]).toMatchObject({
				timerState: "running",
				snapshot: {
					state: "focus",
					minutes: 25,
					seconds: 0,
					focusIntervals: { set: 0, total: 0 },
				},
			});

			intervalTimer.dispose();
		});

		it("should emit a state-changed event when paused", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			clear(events);

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(1000);
			intervalTimer.pause();

			// Assert
			expect(last(stateChangedEvents(events))).toMatchObject({
				timerState: "paused",
				snapshot: {
					state: "focus",
					minutes: 0,
					seconds: 59,
					focusIntervals: { set: 0, total: 0 },
				},
			});

			intervalTimer.dispose();
		});

		it("should emit a state-changed event when reset", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			clear(events);

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(1000);
			intervalTimer.reset();

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "initialized",
					snapshot: {
						state: "focus",
						minutes: 1,
						seconds: 0,
						focusIntervals: { set: 0, total: 0 },
					},
				}),
			);

			intervalTimer.dispose();
		});

		it("should reset intervals set and move to long break", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 3, set: 2 },
			});
			clear(events);

			// Act
			intervalTimer.resetIntervalsSet();

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "initialized",
					snapshot: {
						state: "longBreak",
						minutes: 15,
						seconds: 0,
						focusIntervals: { set: 0, total: 3 },
					},
				}),
			);

			intervalTimer.dispose();
		});

		it("should restart set counting from 1 after resetIntervalsSet", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 3, set: 2 },
			});
			clear(events);

			// Act
			intervalTimer.resetIntervalsSet();
			intervalTimer.skipInterval(); // skips long break
			intervalTimer.skipInterval(); // skips focus and should increment set to 1

			// Assert
			expect(last(stateChangedEvents(events))).toMatchObject({
				timerState: "initialized",
				snapshot: {
					state: "shortBreak",
					minutes: 5,
					seconds: 0,
					focusIntervals: { set: 1, total: 4 },
				},
			});

			intervalTimer.dispose();
		});

		it("should reset total intervals and move to focus", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 2, set: 1 },
			});
			clear(events);

			// Act
			intervalTimer.resetTotalIntervals();

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "initialized",
					snapshot: {
						state: "focus",
						minutes: 25,
						seconds: 0,
						focusIntervals: { set: 0, total: 0 },
					},
				}),
			);

			intervalTimer.dispose();
		});

		it("should update only the minutes when the timer is stopped", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 30,
				focusIntervals: { total: 0, set: 0 },
			});
			clear(events);

			// Act
			const result = intervalTimer.retime(7);

			// Assert
			expect(result).toEqual({ ok: true, value: undefined });
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "initialized",
					snapshot: {
						state: "focus",
						minutes: 7,
						seconds: 30,
						focusIntervals: { set: 0, total: 0 },
					},
				}),
			);

			intervalTimer.dispose();
		});

		it("should not update timer duration while running", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			intervalTimer.start();
			clear(events);

			// Act
			const result = intervalTimer.retime(7);

			// Assert
			expect(result).toEqual({ ok: false, reason: "timer_running" });
			expect(stateChangedEvents(events)).toHaveLength(0);

			intervalTimer.dispose();
		});

		it("should reject non-integer or non-positive minutes", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			clear(events);

			// Act & Assert
			expect(intervalTimer.retime(1.5)).toEqual({
				ok: false,
				reason: "invalid_minutes",
			});
			expect(intervalTimer.retime(0)).toEqual({
				ok: false,
				reason: "invalid_minutes",
			});
			expect(intervalTimer.retime(-5)).toEqual({
				ok: false,
				reason: "invalid_minutes",
			});
			expect(stateChangedEvents(events)).toHaveLength(0);

			intervalTimer.dispose();
		});

		it("should reject minutes at or beyond the upper bound", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			clear(events);

			// Act & Assert
			expect(intervalTimer.retime(minutesUpperBound)).toEqual({
				ok: false,
				reason: "out_of_range_minutes",
			});
			expect(stateChangedEvents(events)).toHaveLength(0);

			expect(intervalTimer.retime(minutesUpperBound - 1)).toEqual({
				ok: true,
				value: undefined,
			});

			intervalTimer.dispose();
		});
	});

	describe("Transitions and counting", () => {
		it("should advance to long break when focus intervals reach longBreakAfter", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 2,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 1, set: 1 },
			});
			clear(events);

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(
				settings.focusIntervalDuration * 60 * 1000 + 1000,
			);

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "initialized",
					snapshot: {
						state: "longBreak",
						minutes: 15,
						seconds: 0,
						focusIntervals: { set: 0, total: 2 },
					},
				}),
			);
			expect(intervalCompletedEvents(events)).toContainEqual(
				expect.objectContaining({
					to: "longBreak",
					notificationMessage: "🏖️  Time for a long break",
				}),
			);

			intervalTimer.dispose();
		});

		it("should keep counting correctly across multiple long break cycles", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 2,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			clear(events);

			// Act
			intervalTimer.skipInterval();
			intervalTimer.skipInterval();
			intervalTimer.skipInterval();
			intervalTimer.skipInterval();

			// Assert
			const changes = stateChangedEvents(events);
			expect(changes[0]).toMatchObject({
				timerState: "initialized",
				snapshot: {
					state: "shortBreak",
					minutes: 5,
					seconds: 0,
					focusIntervals: { set: 1, total: 1 },
				},
			});
			expect(changes[1]).toMatchObject({
				timerState: "initialized",
				snapshot: {
					state: "focus",
					minutes: 25,
					seconds: 0,
					focusIntervals: { set: 1, total: 1 },
				},
			});
			expect(changes[2]).toMatchObject({
				timerState: "initialized",
				snapshot: {
					state: "longBreak",
					minutes: 15,
					seconds: 0,
					focusIntervals: { set: 0, total: 2 },
				},
			});
			expect(changes[3]).toMatchObject({
				timerState: "initialized",
				snapshot: {
					state: "focus",
					minutes: 25,
					seconds: 0,
					focusIntervals: { set: 0, total: 2 },
				},
			});

			intervalTimer.dispose();
		});

		it("should advance to focus after a short break", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "shortBreak",
				minutes: settings.shortBreakDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			clear(events);

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(
				settings.shortBreakDuration * 60 * 1000 + 1000,
			);

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "initialized",
					snapshot: {
						state: "focus",
						minutes: 25,
						seconds: 0,
						focusIntervals: { set: 0, total: 0 },
					},
				}),
			);
			expect(intervalCompletedEvents(events)).toContainEqual(
				expect.objectContaining({
					to: "focus",
					notificationMessage: "⏰  Now it's time to focus",
				}),
			);

			intervalTimer.dispose();
		});

		it("should not increment focus intervals when short break completes", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 1,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "shortBreak",
				minutes: settings.shortBreakDuration,
				seconds: 0,
				focusIntervals: { total: 7, set: 3 },
			});
			clear(events);

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(
				settings.shortBreakDuration * 60 * 1000 + 1000,
			);

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "initialized",
					snapshot: {
						state: "focus",
						minutes: 25,
						seconds: 0,
						focusIntervals: { set: 3, total: 7 },
					},
				}),
			);

			intervalTimer.dispose();
		});

		it("should advance to short break after focus completion", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			clear(events);

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(
				settings.focusIntervalDuration * 60 * 1000 + 1000,
			);

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "initialized",
					snapshot: {
						state: "shortBreak",
						minutes: 5,
						seconds: 0,
						focusIntervals: { set: 1, total: 1 },
					},
				}),
			);
			expect(intervalCompletedEvents(events)).toContainEqual(
				expect.objectContaining({
					to: "shortBreak",
					notificationMessage: "☕️  Time for a short break",
				}),
			);

			intervalTimer.dispose();
		});

		it("should advance to short break without notification when skipped", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			clear(events);

			// Act
			intervalTimer.skipInterval();

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "initialized",
					snapshot: {
						state: "shortBreak",
						minutes: 5,
						seconds: 0,
						focusIntervals: { set: 1, total: 1 },
					},
				}),
			);
			expect(intervalCompletedEvents(events)).toHaveLength(0);

			intervalTimer.dispose();
		});

		it("should not increment focus intervals when short break is skipped", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "shortBreak",
				minutes: settings.shortBreakDuration,
				seconds: 0,
				focusIntervals: { total: 2, set: 1 },
			});
			clear(events);

			// Act
			intervalTimer.skipInterval();

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "initialized",
					snapshot: {
						state: "focus",
						minutes: 25,
						seconds: 0,
						focusIntervals: { set: 1, total: 2 },
					},
				}),
			);

			intervalTimer.dispose();
		});
	});

	describe("Touch behavior", () => {
		it("should start when touch is called from initialized state", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			clear(events);

			// Act
			intervalTimer.touch();
			vi.advanceTimersByTime(1000);

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "running",
					snapshot: {
						state: "focus",
						minutes: 0,
						seconds: 59,
						focusIntervals: { set: 0, total: 0 },
					},
				}),
			);

			intervalTimer.dispose();
		});

		it("should reset when touch is called during focus running", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			clear(events);

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(1000);
			intervalTimer.touch();

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "initialized",
					snapshot: {
						state: "focus",
						minutes: 1,
						seconds: 0,
						focusIntervals: { set: 0, total: 0 },
					},
				}),
			);

			intervalTimer.dispose();
		});

		it("should start when touch is called from paused state", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(1000);
			intervalTimer.pause();
			clear(events);
			intervalTimer.touch();
			vi.advanceTimersByTime(1000);

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "running",
					snapshot: {
						state: "focus",
						minutes: 0,
						seconds: 58,
						focusIntervals: { set: 0, total: 0 },
					},
				}),
			);

			intervalTimer.dispose();
		});

		it("should skip interval when touch is called during short break", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.applySnapshot({
				state: "shortBreak",
				minutes: settings.shortBreakDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});

			// Act
			intervalTimer.start();
			clear(events);
			intervalTimer.touch();

			// Assert
			expect(last(stateChangedEvents(events))).toMatchObject({
				timerState: "initialized",
				snapshot: {
					state: "focus",
					minutes: 25,
					seconds: 0,
					focusIntervals: { set: 0, total: 0 },
				},
			});
			expect(intervalCompletedEvents(events)).toHaveLength(0);

			intervalTimer.dispose();
		});
	});

	describe("Predict touch behavior", () => {
		const settings: IntervalTimerSetting = {
			focusIntervalDuration: 25,
			shortBreakDuration: 5,
			longBreakDuration: 15,
			longBreakAfter: 4,
			resetTime: { hours: 0, minutes: 0 },
		};

		it("should predict start from initialized state", () => {
			// Arrange
			const intervalTimer = new IntervalTimer(settings);

			// Act
			const action = intervalTimer.predictTouch();

			// Assert
			expect(action).toBe("start");
			intervalTimer.dispose();
		});

		it("should predict resume from paused state", () => {
			// Arrange
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.start();
			intervalTimer.pause();

			// Act
			const action = intervalTimer.predictTouch();

			// Assert
			expect(action).toBe("resume");
			intervalTimer.dispose();
		});

		it("should predict reset while a focus interval is running", () => {
			// Arrange
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.start();

			// Act
			const action = intervalTimer.predictTouch();

			// Assert
			expect(action).toBe("reset");
			intervalTimer.dispose();
		});

		it("should predict skip while a break interval is running", () => {
			// Arrange
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.applySnapshot({
				state: "shortBreak",
				minutes: settings.shortBreakDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			intervalTimer.start();

			// Act
			const action = intervalTimer.predictTouch();

			// Assert
			expect(action).toBe("skip");
			intervalTimer.dispose();
		});
	});

	describe("Setters and getters", () => {
		it("should return focus as the initial state", () => {
			// Arrange
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});

			// Act & Assert
			expect(intervalTimer.state).toBe("focus");

			intervalTimer.dispose();
		});

		it("should return shortBreak after skipping focus", () => {
			// Arrange
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});

			// Act
			intervalTimer.skipInterval();

			// Assert
			expect(intervalTimer.state).toBe("shortBreak");

			intervalTimer.dispose();
		});
	});

	describe("Snapshot", () => {
		it("should apply snapshot values to state, time, and intervals", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			clear(events);

			// Act
			intervalTimer.applySnapshot({
				state: "shortBreak",
				minutes: 3,
				seconds: 20,
				focusIntervals: { total: 7, set: 2 },
			});

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "initialized",
					snapshot: {
						state: "shortBreak",
						minutes: 3,
						seconds: 20,
						focusIntervals: { set: 2, total: 7 },
					},
				}),
			);

			intervalTimer.dispose();
		});

		it("should restore the pending next interval from a snapshot", () => {
			// Arrange
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});

			// Act
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: 2,
				seconds: 3,
				negative: true,
				nextState: "shortBreak",
				focusIntervals: { total: 1, set: 1 },
			});

			// Assert
			expect(intervalTimer.predictTouch()).toBe("next");
			expect(intervalTimer.canStart).toBe(false);

			intervalTimer.dispose();
		});

		it("should apply explicit default snapshot values", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(settings);
			intervalTimer.subscribe((event) => events.push(event));
			clear(events);

			// Act
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});

			// Assert
			expect(stateChangedEvents(events)).toContainEqual(
				expect.objectContaining({
					timerState: "initialized",
					snapshot: {
						state: "focus",
						minutes: 25,
						seconds: 0,
						focusIntervals: { set: 0, total: 0 },
					},
				}),
			);

			intervalTimer.dispose();
		});
	});

	describe("Count down past zero", () => {
		it("applies completion behavior changes to the current interval", () => {
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 1,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			});

			intervalTimer.updateSettings({
				intervalCompletionBehavior: "countDownPastZero",
			});
			intervalTimer.start();
			vi.advanceTimersByTime(61_000);

			expect(intervalTimer.status).toMatchObject({
				timerState: "running",
				snapshot: {
					negative: true,
					nextState: "shortBreak",
				},
			});

			intervalTimer.dispose();
		});

		it("keeps the completed interval running in overtime", () => {
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 1,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				intervalCompletionBehavior: "countDownPastZero",
				resetTime: { hours: 0, minutes: 0 },
			});
			intervalTimer.start();
			vi.advanceTimersByTime(61_000);

			expect(intervalTimer.state).toBe("focus");
			expect(intervalTimer.status).toEqual({
				timerState: "running",
				snapshot: {
					minutes: 0,
					seconds: 1,
					negative: true,
					state: "focus",
					nextState: "shortBreak",
					focusIntervals: { total: 1, set: 1 },
				},
			});
			expect(intervalTimer.predictTouch()).toBe("next");

			intervalTimer.dispose();
		});

		it("moves to the pending interval when Next is touched", () => {
			// Arrange
			const events: IntervalTimerEvent[] = [];
			const intervalTimer = new IntervalTimer({
				focusIntervalDuration: 1,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				intervalCompletionBehavior: "countDownPastZero",
				resetTime: { hours: 0, minutes: 0 },
			});
			intervalTimer.subscribe((event) => events.push(event));
			intervalTimer.start();
			vi.advanceTimersByTime(61_000);

			// Act
			intervalTimer.touch();

			// Assert
			expect(intervalTimer.state).toBe("shortBreak");
			expect(intervalTimer.status.snapshot).toMatchObject({
				minutes: 5,
				seconds: 0,
				focusIntervals: { total: 1, set: 1 },
			});
			expect(intervalTimer.status.snapshot).not.toHaveProperty(
				"negative",
			);
			expect(intervalCompletedEvents(events)).toContainEqual(
				expect.objectContaining({
					notificationMessage: "☕️  Time for a short break",
					from: "focus",
					to: "shortBreak",
				}),
			);

			intervalTimer.dispose();
		});
	});

	describe("Events", () => {
		const settings: IntervalTimerSetting = {
			focusIntervalDuration: 1,
			shortBreakDuration: 1,
			longBreakDuration: 1,
			longBreakAfter: 4,
			resetTime: { hours: 0, minutes: 0 },
		};

		const createTimer = (): IntervalTimer => new IntervalTimer(settings);

		it("should publish state and operation events with a snapshot", () => {
			const intervalTimer = createTimer();
			const events: IntervalTimerEvent[] = [];
			intervalTimer.subscribe((event) => events.push(event));

			intervalTimer.start();

			expect(events.map((event) => event.type)).toStrictEqual([
				"state-changed",
				"timer-started",
			]);
			expect(events[1]).toMatchObject({
				type: "timer-started",
				mode: "fresh",
				snapshot: {
					minutes: 1,
					seconds: 0,
					state: "focus",
					focusIntervals: { total: 0, set: 0 },
				},
			});
			expect(events[1]?.occurredAt).toBeInstanceOf(Date);

			intervalTimer.dispose();
		});

		it("should distinguish skipped and completed intervals", () => {
			const intervalTimer = createTimer();
			const events: IntervalTimerEvent[] = [];
			intervalTimer.subscribe((event) => events.push(event));

			intervalTimer.start();
			intervalTimer.skipInterval();
			intervalTimer.start();
			vi.advanceTimersByTime(60_000);

			expect(events).not.toContainEqual(
				expect.objectContaining({
					type: "state-changed",
					timerState: "paused",
				}),
			);
			expect(
				events.find((event) => event.type === "focus-interval-ended"),
			).toMatchObject({ reason: "skipped" });
			expect(
				events.find((event) => event.type === "interval-skipped"),
			).toMatchObject({ from: "focus", to: "shortBreak" });
			expect(
				events.find((event) => event.type === "interval-completed"),
			).toMatchObject({
				from: "shortBreak",
				to: "focus",
				notificationMessage: "⏰  Now it's time to focus",
			});

			intervalTimer.dispose();
		});

		it("should stop publishing to an unsubscribed listener", () => {
			const intervalTimer = createTimer();
			const listener = vi.fn();
			const unsubscribe = intervalTimer.subscribe(listener);

			unsubscribe();
			intervalTimer.start();

			expect(listener).not.toHaveBeenCalled();

			intervalTimer.dispose();
		});
	});
});
