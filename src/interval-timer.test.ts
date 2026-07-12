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
			// Arrange
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0)); // 23:59:00
			const handleChangeState = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {},
			);
			intervalTimer.enableAutoReset();
			handleChangeState.mockClear();

			// Act
			vi.advanceTimersByTime(1000); // Advance to 23:59:01
			vi.advanceTimersByTime(60000); // Advance to 00:00:01 (crosses reset time)

			// Assert
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
			// Arrange
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0)); // 23:59:00
			const handleChangeState = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {},
			);
			intervalTimer.enableAutoReset();
			handleChangeState.mockClear();

			// Act
			vi.advanceTimersByTime(1000); // Advance to 23:59:01
			vi.advanceTimersByTime(1000); // Advance to 23:59:02 (still before reset time)

			// Assert
			expect(handleChangeState).not.toHaveBeenCalled();

			intervalTimer.dispose();
		});

		it("should reset intervals when crossing reset time right after enableAutoReset", () => {
			// Arrange
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 59, 999)); // just before reset time
			const handleChangeState = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {},
			);
			intervalTimer.enableAutoReset();
			handleChangeState.mockClear();

			// Act
			// Advance 1 second to cross the reset time (now 00:00:00)
			vi.advanceTimersByTime(1000);

			// Assert
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
			// Arrange
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0)); // 23:59:00
			const handleChangeState = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {},
			);
			intervalTimer.enableAutoReset();
			intervalTimer.disableAutoReset();
			handleChangeState.mockClear();

			// Act
			vi.advanceTimersByTime(1000); // Advance to 23:59:01
			vi.advanceTimersByTime(60000); // Advance to 00:00:01 (crosses reset time)

			// Assert
			expect(handleChangeState).not.toHaveBeenCalled();

			intervalTimer.dispose();
		});

		it("should not reset intervals after dispose", () => {
			// Arrange
			vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0)); // 23:59:00
			const handleChangeState = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {},
			);
			intervalTimer.enableAutoReset();
			intervalTimer.dispose();
			handleChangeState.mockClear();

			// Act
			vi.advanceTimersByTime(1000); // Advance to 23:59:01
			vi.advanceTimersByTime(60000); // Advance to 00:00:01 (crosses reset time)

			// Assert
			expect(handleChangeState).not.toHaveBeenCalled();
		});
	});

	describe("Basic controls", () => {
		it("should allow starting but not pausing initially", () => {
			// Arrange
			const intervalTimer = new IntervalTimer(
				() => {},
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {},
			);

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
			const intervalTimer = new IntervalTimer(
				() => {},
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {},
			);

			// Act
			intervalTimer.start();

			// Assert
			expect(intervalTimer.canStart).toBe(false);
			expect(intervalTimer.canPause).toBe(true);

			intervalTimer.dispose();
		});

		it("should allow starting but not pausing while paused", () => {
			// Arrange
			const intervalTimer = new IntervalTimer(
				() => {},
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {},
			);
			intervalTimer.start();

			// Act
			intervalTimer.pause();

			// Assert
			expect(intervalTimer.canStart).toBe(true);
			expect(intervalTimer.canPause).toBe(false);

			intervalTimer.dispose();
		});

		it("should apply updated durations from the next interval", () => {
			const handleChangeState = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {},
			);
			handleChangeState.mockClear();

			intervalTimer.updateSettings({ shortBreakDuration: 10 });
			intervalTimer.skipInterval();

			expect(handleChangeState).toHaveBeenLastCalledWith(
				"initialized",
				"shortBreak",
				{ minutes: 10, seconds: 0 },
				{ set: 1, total: 1 },
			);

			intervalTimer.dispose();
		});

		it("should not change the duration of the current interval", () => {
			const handleChangeState = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {},
			);
			handleChangeState.mockClear();

			intervalTimer.updateSettings({ focusIntervalDuration: 30 });
			intervalTimer.start();
			vi.advanceTimersByTime(1000);

			expect(handleChangeState).toHaveBeenLastCalledWith(
				"running",
				"focus",
				{ minutes: 24, seconds: 59 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should start a long break after lowering longBreakAfter below the current set count", () => {
			const handleChangeState = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {},
			);
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: 25,
				seconds: 0,
				focusIntervals: { total: 3, set: 3 },
			});
			handleChangeState.mockClear();

			intervalTimer.updateSettings({ longBreakAfter: 2 });
			intervalTimer.skipInterval();

			expect(handleChangeState).toHaveBeenLastCalledWith(
				"initialized",
				"longBreak",
				{ minutes: 15, seconds: 0 },
				{ set: 0, total: 4 },
			);

			intervalTimer.dispose();
		});

		it("should enter running state when started", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const notifier = vi.fn();
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				notifier,
			);
			handleChangeState.mockClear();

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(1000);

			// Assert
			expect(handleChangeState).toHaveBeenCalledWith(
				"running",
				"focus",
				{ minutes: 24, seconds: 59 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should call handleChangeState when paused", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			handleChangeState.mockClear();

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(1000);
			intervalTimer.pause();

			// Assert
			expect(handleChangeState).toHaveBeenLastCalledWith(
				"paused",
				"focus",
				{ minutes: 0, seconds: 59 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should call handleChangeState when reset", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			handleChangeState.mockClear();

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(1000);
			intervalTimer.reset();

			// Assert
			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"focus",
				{ minutes: 1, seconds: 0 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should reset intervals set and move to long break", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 3, set: 2 },
			});
			handleChangeState.mockClear();

			// Act
			intervalTimer.resetIntervalsSet();

			// Assert
			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"longBreak",
				{ minutes: 15, seconds: 0 },
				{ set: 0, total: 3 },
			);

			intervalTimer.dispose();
		});

		it("should restart set counting from 1 after resetIntervalsSet", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 3, set: 2 },
			});
			handleChangeState.mockClear();

			// Act
			intervalTimer.resetIntervalsSet();
			intervalTimer.skipInterval(); // skips long break
			intervalTimer.skipInterval(); // skips focus and should increment set to 1

			// Assert
			expect(handleChangeState).toHaveBeenLastCalledWith(
				"initialized",
				"shortBreak",
				{ minutes: 5, seconds: 0 },
				{ set: 1, total: 4 },
			);

			intervalTimer.dispose();
		});

		it("should reset total intervals and move to focus", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 2, set: 1 },
			});
			handleChangeState.mockClear();

			// Act
			intervalTimer.resetTotalIntervals();

			// Assert
			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"focus",
				{ minutes: 25, seconds: 0 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should allow updating timer duration only when timer is stopped", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			handleChangeState.mockClear();

			// Act
			const result = intervalTimer.retime(7);

			// Assert
			expect(result).toEqual({ ok: true, value: undefined });
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
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			handleChangeState.mockClear();

			// Act
			intervalTimer.start();
			const result = intervalTimer.retime(7);

			// Assert
			expect(result).toEqual({ ok: false, reason: "timer_running" });
			expect(handleChangeState).not.toHaveBeenCalled();

			intervalTimer.dispose();
		});

		it("should reject non-integer or non-positive minutes", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			handleChangeState.mockClear();

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
			expect(handleChangeState).not.toHaveBeenCalled();

			intervalTimer.dispose();
		});
	});

	describe("Transitions and counting", () => {
		it("should advance to long break when focus intervals reach longBreakAfter", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const notifier = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 2,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				notifier,
			);
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 1, set: 1 },
			});
			handleChangeState.mockClear();

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(
				settings.focusIntervalDuration * 60 * 1000 + 1000,
			);

			// Assert
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
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 2,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			handleChangeState.mockClear();

			// Act
			intervalTimer.skipInterval();
			intervalTimer.skipInterval();
			intervalTimer.skipInterval();
			intervalTimer.skipInterval();

			// Assert
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
			// Arrange
			const handleChangeState = vi.fn();
			const notifier = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				notifier,
			);
			intervalTimer.applySnapshot({
				state: "shortBreak",
				minutes: settings.shortBreakDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			handleChangeState.mockClear();

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(
				settings.shortBreakDuration * 60 * 1000 + 1000,
			);

			// Assert
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
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 1,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			intervalTimer.applySnapshot({
				state: "shortBreak",
				minutes: settings.shortBreakDuration,
				seconds: 0,
				focusIntervals: { total: 7, set: 3 },
			});
			handleChangeState.mockClear();

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(
				settings.shortBreakDuration * 60 * 1000 + 1000,
			);

			// Assert
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
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				notifier,
			);
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
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
			// Arrange
			const handleChangeState = vi.fn();
			const notifier = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				notifier,
			);
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			handleChangeState.mockClear();

			// Act
			intervalTimer.skipInterval();

			// Assert
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
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			intervalTimer.applySnapshot({
				state: "shortBreak",
				minutes: settings.shortBreakDuration,
				seconds: 0,
				focusIntervals: { total: 2, set: 1 },
			});
			handleChangeState.mockClear();

			// Act
			intervalTimer.skipInterval();

			// Assert
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
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			handleChangeState.mockClear();

			// Act
			intervalTimer.touch();
			vi.advanceTimersByTime(1000);

			// Assert
			expect(handleChangeState).toHaveBeenCalledWith(
				"running",
				"focus",
				{ minutes: 0, seconds: 59 },
				{ set: 0, total: 0 },
			);

			intervalTimer.dispose();
		});

		it("should reset when touch is called during focus running", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 1,
				shortBreakDuration: 1,
				longBreakDuration: 1,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			handleChangeState.mockClear();

			// Act
			intervalTimer.start();
			vi.advanceTimersByTime(1000);
			intervalTimer.touch();

			// Assert
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
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
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
			// Arrange
			const handleChangeState = vi.fn();
			const notifier = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				notifier,
			);
			intervalTimer.applySnapshot({
				state: "shortBreak",
				minutes: settings.shortBreakDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});
			handleChangeState.mockClear();

			// Act
			intervalTimer.start();
			handleChangeState.mockClear();
			intervalTimer.touch();

			// Assert
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

	describe("Setters and getters", () => {
		it("should return focus as the initial state", () => {
			// Arrange
			const intervalTimer = new IntervalTimer(
				() => {},
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {},
			);

			// Act & Assert
			expect(intervalTimer.state).toBe("focus");

			intervalTimer.dispose();
		});

		it("should return shortBreak after skipping focus", () => {
			// Arrange
			const intervalTimer = new IntervalTimer(
				() => {},
				{
					focusIntervalDuration: 25,
					shortBreakDuration: 5,
					longBreakDuration: 15,
					longBreakAfter: 4,
					resetTime: { hours: 0, minutes: 0 },
				},
				() => {},
			);

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
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			handleChangeState.mockClear();

			// Act
			intervalTimer.applySnapshot({
				state: "shortBreak",
				minutes: 3,
				seconds: 20,
				focusIntervals: { total: 7, set: 2 },
			});

			// Assert
			expect(handleChangeState).toHaveBeenCalledWith(
				"initialized",
				"shortBreak",
				{ minutes: 3, seconds: 20 },
				{ set: 2, total: 7 },
			);

			intervalTimer.dispose();
		});

		it("should apply explicit default snapshot values", () => {
			// Arrange
			const handleChangeState = vi.fn();
			const settings: IntervalTimerSetting = {
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				resetTime: { hours: 0, minutes: 0 },
			};
			const intervalTimer = new IntervalTimer(
				handleChangeState,
				settings,
				() => {},
			);
			handleChangeState.mockClear();

			// Act
			intervalTimer.applySnapshot({
				state: "focus",
				minutes: settings.focusIntervalDuration,
				seconds: 0,
				focusIntervals: { total: 0, set: 0 },
			});

			// Assert
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
