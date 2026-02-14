import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { IntervalTimer, IntervalTimerSetting } from "./interval-timer";

describe("IntervalTimer", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Auto reset", () => {
		it("should reset intervals when reset time is passed", () => {
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0)); // 23:59:00
			const handleChangeState = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					notificationStyle: "simple",
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			intervalTimer.enableAutoReset();
			handleChangeState.mockClear();

			vi.advanceTimersByTime(1000); // Advance to 23:59:01
			vi.advanceTimersByTime(60000); // Advance to 00:00:01 (crosses reset time)

			expect(handleChangeState).toHaveBeenCalledTimes(1);
			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"focus",
				{ minutes: 25, seconds: 0 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should not reset intervals if reset time has not been passed", () => {
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0)); // 23:59:00
			const handleChangeState = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					notificationStyle: "simple",
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			intervalTimer.enableAutoReset();
			handleChangeState.mockClear();

			vi.advanceTimersByTime(1000); // Advance to 23:59:01
			vi.advanceTimersByTime(1000); // Advance to 23:59:02 (still before reset time)

			expect(handleChangeState).not.toHaveBeenCalled();

			intervalTimer.dispose();
		});

		it("should reset intervals when crossing reset time right after enableAutoReset", () => {
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 59, 999)); // just before reset time
			const handleChangeState = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					notificationStyle: "simple",
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			intervalTimer.enableAutoReset();
			handleChangeState.mockClear();

			// Advance 1 second to cross the reset time (now 00:00:00)
			vi.advanceTimersByTime(1000);

			// Should have reset exactly once because we crossed the reset time
			expect(handleChangeState).toHaveBeenCalledTimes(1);
			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"focus",
				{ minutes: 25, seconds: 0 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should not reset intervals after disableAutoReset", () => {
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0)); // 23:59:00
			const handleChangeState = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					notificationStyle: "simple",
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			intervalTimer.enableAutoReset();
			intervalTimer.disableAutoReset();
			handleChangeState.mockClear();

			vi.advanceTimersByTime(1000); // Advance to 23:59:01
			vi.advanceTimersByTime(60000); // Advance to 00:00:01 (crosses reset time)

			expect(handleChangeState).not.toHaveBeenCalled();

			intervalTimer.dispose();
		});

		it("should not reset intervals after dispose", () => {
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0)); // 23:59:00
			const handleChangeState = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					notificationStyle: "simple",
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			intervalTimer.enableAutoReset();
			intervalTimer.dispose();
			handleChangeState.mockClear();

			vi.advanceTimersByTime(1000); // Advance to 23:59:01
			vi.advanceTimersByTime(60000); // Advance to 00:00:01 (crosses reset time)

			expect(handleChangeState).not.toHaveBeenCalled();
		});
	});

	describe("Basic controls", () => {
		it("should enter running state when started", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const notifier = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				notifier,
			);
			handleChangeState.mockClear();

			intervalTimer.start();
			vi.advanceTimersByTime(1000);
			expect(handleChangeState).toHaveBeenCalledWith(
				"running",
				"focus",
				{ minutes: 24, seconds: 59 },
				{ set: 0, total: 0 },
			);
			intervalTimer.dispose();
		});

		it("should call handleChangeState when paused", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			handleChangeState.mockClear();

			intervalTimer.start();
			vi.advanceTimersByTime(1000);
			intervalTimer.pause();

			expect(handleChangeState).toHaveBeenLastCalledWith(
				"paused",
				"focus",
				{ minutes: 0, seconds: 59 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should call handleChangeState when reset", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			handleChangeState.mockClear();

			intervalTimer.start();
			vi.advanceTimersByTime(1000);
			intervalTimer.reset();

			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"focus",
				{ minutes: 1, seconds: 0 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should reset intervals set and move to long break", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			intervalTimer.applySnapshot({
				focusIntervals: { total: 3, set: 2 },
			});
			handleChangeState.mockClear();

			intervalTimer.resetIntervalsSet();

			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"longBreak",
				{ minutes: 15, seconds: 0 },
				{ set: 0, total: 3 },
			);

			intervalTimer.dispose();
		});

		it("should restart set counting from 1 after resetIntervalsSet", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			intervalTimer.applySnapshot({
				focusIntervals: { total: 3, set: 2 },
				state: "focus",
			});
			handleChangeState.mockClear();

			intervalTimer.resetIntervalsSet();
			intervalTimer.skipInterval(); // skips long break
			intervalTimer.skipInterval(); // skips focus and should increment set to 1

			expect(handleChangeState).toHaveBeenLastCalledWith(
				"initialized",
				"shortBreak",
				{ minutes: 5, seconds: 0 },
				{ set: 1, total: 4 },
			);

			intervalTimer.dispose();
		});

		it("should reset total intervals and move to focus", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			intervalTimer.applySnapshot({
				focusIntervals: { total: 2, set: 1 },
			});
			handleChangeState.mockClear();

			intervalTimer.resetTotalIntervals();

			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"focus",
				{ minutes: 25, seconds: 0 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should allow updating timer duration only when timer is stopped", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			intervalTimer.applySnapshot({ state: "focus" });
			handleChangeState.mockClear();

			const updated = intervalTimer.retime(7);

			expect(updated).toBe(true);
			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"focus",
				{ minutes: 7, seconds: 0 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should not update timer duration while running", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			intervalTimer.applySnapshot({ state: "focus" });
			handleChangeState.mockClear();

			// Act
			intervalTimer.start();
			const updated = intervalTimer.retime(7);

			// Assert
			expect(updated).toBe(false);
			expect(handleChangeState).not.toHaveBeenCalled();

			intervalTimer.dispose();
		});
	});

	describe("Transitions and counting", () => {
		it("should advance to long break when focus intervals reach longBreakAfter", () => {
			const handleChangeState = vi.fn();
			const notifier = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 2,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				notifier,
			);
			intervalTimer.applySnapshot({
				focusIntervals: { total: 1, set: 1 },
				state: "focus",
			});
			handleChangeState.mockClear();

			intervalTimer.start();
			vi.advanceTimersByTime(
				settings.focusIntervalDuration * 60 * 1000 + 1000,
			);

			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"longBreak",
				{ minutes: 15, seconds: 0 },
				{ set: 0, total: 2 },
			);
			expect(notifier).toHaveBeenCalledWith("🏖️  Time for a long break", {
				state: "longBreak",
			});

			intervalTimer.dispose();
		});

		it("should keep counting correctly across multiple long break cycles", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 2,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			intervalTimer.applySnapshot({ state: "focus" });
			handleChangeState.mockClear();

			intervalTimer.skipInterval();
			intervalTimer.skipInterval();
			intervalTimer.skipInterval();
			intervalTimer.skipInterval();

			expect(handleChangeState).toHaveBeenNthCalledWith(
				1,
				"initialized",
				"shortBreak",
				{ minutes: 5, seconds: 0 },
				{ set: 1, total: 1 },
			);
			expect(handleChangeState).toHaveBeenNthCalledWith(
				2,
				"initialized",
				"focus",
				{ minutes: 25, seconds: 0 },
				{ set: 1, total: 1 },
			);
			expect(handleChangeState).toHaveBeenNthCalledWith(
				3,
				"initialized",
				"longBreak",
				{ minutes: 15, seconds: 0 },
				{ set: 0, total: 2 },
			);
			expect(handleChangeState).toHaveBeenNthCalledWith(
				4,
				"initialized",
				"focus",
				{ minutes: 25, seconds: 0 },
				{ set: 0, total: 2 },
			);

			intervalTimer.dispose();
		});

		it("should advance to focus after a short break", () => {
			const handleChangeState = vi.fn();
			const notifier = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				notifier,
			);
			intervalTimer.applySnapshot({ state: "shortBreak" });
			handleChangeState.mockClear();

			intervalTimer.start();
			vi.advanceTimersByTime(
				settings.focusIntervalDuration * 60 * 1000 + 1000,
			);

			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"focus",
				{ minutes: 25, seconds: 0 },
				{ set: 0, total: 0 },
			);
			expect(notifier).toHaveBeenCalledWith(
				"⏰  Now it's time to focus",
				{
					state: "focus",
				},
			);

			intervalTimer.dispose();
		});

		it("should not increment focus intervals when short break completes", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 1,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			intervalTimer.applySnapshot({
				state: "shortBreak",
				minutes: settings.shortBreakDuration,
				focusIntervals: { total: 7, set: 3 },
			});
			handleChangeState.mockClear();

			intervalTimer.start();
			vi.advanceTimersByTime(
				settings.shortBreakDuration * 60 * 1000 + 1000,
			);

			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"focus",
				{ minutes: 25, seconds: 0 },
				{ set: 3, total: 7 },
			);

			intervalTimer.dispose();
		});

		it("should advance to short break after focus completion", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const notifier = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				notifier,
			);
			intervalTimer.applySnapshot({ state: "focus" });
			handleChangeState.mockClear();

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(
				settings.focusIntervalDuration * 60 * 1000 + 1000,
			);

			// Assert
			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"shortBreak",
				{ minutes: 5, seconds: 0 },
				{ set: 1, total: 1 },
			);
			expect(notifier).toHaveBeenCalledWith(
				"☕️  Time for a short break",
				{
					state: "shortBreak",
				},
			);

			intervalTimer.dispose();
		});

		it("should advance to short break without notification when skipped", () => {
			const handleChangeState = vi.fn();
			const notifier = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				notifier,
			);
			intervalTimer.applySnapshot({ state: "focus" });
			handleChangeState.mockClear();

			intervalTimer.skipInterval();

			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"shortBreak",
				{ minutes: 5, seconds: 0 },
				{ set: 1, total: 1 },
			);
			expect(notifier).not.toHaveBeenCalled();

			intervalTimer.dispose();
		});

		it("should not increment focus intervals when short break is skipped", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			intervalTimer.applySnapshot({
				state: "shortBreak",
				focusIntervals: { total: 2, set: 1 },
			});
			handleChangeState.mockClear();

			intervalTimer.skipInterval();

			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"focus",
				{ minutes: 25, seconds: 0 },
				{ set: 1, total: 2 },
			);

			intervalTimer.dispose();
		});
	});

	describe("Touch behavior", () => {
		it("should start when touch is called from initialized state", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			handleChangeState.mockClear();

			intervalTimer.touch();
			vi.advanceTimersByTime(1000);

			expect(handleChangeState).toHaveBeenCalledWith(
				"running",
				"focus",
				{ minutes: 0, seconds: 59 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should reset when touch is called during focus running", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			handleChangeState.mockClear();

			intervalTimer.start();
			vi.advanceTimersByTime(1000);
			intervalTimer.touch();

			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"focus",
				{ minutes: 1, seconds: 0 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should start when touch is called from paused state", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(1000);
			intervalTimer.pause();
			handleChangeState.mockClear();

			intervalTimer.touch();
			vi.advanceTimersByTime(1000);

			// Assert
			expect(handleChangeState).toHaveBeenCalledWith(
				"running",
				"focus",
				{ minutes: 0, seconds: 58 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should skip interval when touch is called during short break", () => {
			const handleChangeState = vi.fn();
			const notifier = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				notifier,
			);
			intervalTimer.applySnapshot({ state: "shortBreak" });
			handleChangeState.mockClear();

			intervalTimer.start();
			handleChangeState.mockClear();

			intervalTimer.touch();

			expect(handleChangeState).toHaveBeenLastCalledWith(
				"initialized",
				"focus",
				{ minutes: 25, seconds: 0 },
				{ set: 0, total: 0 },
			);
			expect(notifier).not.toHaveBeenCalled();

			intervalTimer.dispose();
		});
	});

	describe("Snapshot", () => {
		it("should apply snapshot values to state, time, and intervals", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			handleChangeState.mockClear();

			intervalTimer.applySnapshot({
				state: "shortBreak",
				minutes: 3,
				seconds: 20,
				focusIntervals: { total: 7, set: 2 },
			});

			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"shortBreak",
				{ minutes: 3, seconds: 20 },
				{ set: 2, total: 7 },
			);

			intervalTimer.dispose();
		});

		it("should fill missing snapshot fields with defaults", () => {
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			);
			handleChangeState.mockClear();

			intervalTimer.applySnapshot({});

			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"focus",
				{ minutes: 25, seconds: 0 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});
	});
});
