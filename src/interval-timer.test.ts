import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { IntervalTimer, IntervalTimerSetting } from "./interval-timer";

describe("IntervalTimer", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

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

	it("should call handleIntervalCreated when started", () => {
		const handleChangeState = vi.fn();
		const settings: IntervalTimerSetting = {
			focusIntervalDuration: 25,
			shortBreakDuration: 5,
			longBreakDuration: 15,
			longBreakAfter: 4,
			notificationStyle: "simple",
			resetTime: { hours: 0, minutes: 0 },
		};
		const handleIntervalCreated = vi.fn();
		const notifier = vi.fn();
		const intervalTimer = new IntervalTimer(
			handleChangeState,
			settings,
			handleIntervalCreated,
			notifier,
		);

		intervalTimer.start();
		expect(handleIntervalCreated).toHaveBeenCalledTimes(1);
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
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			{ focusIntervals: { total: 3, set: 2 } },
		);
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
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			{ focusIntervals: { total: 2, set: 1 } },
		);
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
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			notifier,
			{ focusIntervals: { total: 1, set: 1 }, state: "focus" },
		);
		handleChangeState.mockClear();

		intervalTimer.skipInterval();

		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"longBreak",
			{ minutes: 15, seconds: 0 },
			{ set: 0, total: 2 },
		);
		expect(notifier).toHaveBeenCalledWith("🏖️  Time for a long break", {
			state: "longBreak",
			callContext: {},
		});

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
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			notifier,
			{ state: "shortBreak" },
		);
		handleChangeState.mockClear();

		intervalTimer.skipInterval();

		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			{ minutes: 25, seconds: 0 },
			{ set: 0, total: 0 },
		);
		expect(notifier).toHaveBeenCalledWith("⏰  Now it's time to focus", {
			state: "focus",
			callContext: {},
		});

		intervalTimer.dispose();
	});

	it("should start when touch is called from initialized state", () => {
		const handleChangeState = vi.fn();
		const handleIntervalCreated = vi.fn();
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
			handleIntervalCreated,
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
		);

		intervalTimer.touch();

		expect(handleIntervalCreated).toHaveBeenCalledTimes(1);

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
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			notifier,
			{ state: "shortBreak" },
		);
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
		expect(notifier).toHaveBeenCalledWith("⏰  Now it's time to focus", {
			state: "focus",
			callContext: {},
		});

		intervalTimer.dispose();
	});

	it("should pass callContext to notifier for skipInterval", () => {
		const handleChangeState = vi.fn();
		const handleIntervalCreated = vi.fn();
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
			handleIntervalCreated,
			notifier,
		);

		intervalTimer.withContext({ "dont-flash": true }, (timer) => {
			timer.skipInterval();
		});

		expect(notifier).toHaveBeenCalledTimes(1);
		expect(notifier).toHaveBeenCalledWith("☕️  Time for a short break", {
			state: "shortBreak",
			callContext: { "dont-flash": true },
		});

		intervalTimer.dispose();
	});

	it("should clear callContext after withContext completes", () => {
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
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			notifier,
		);

		intervalTimer.withContext({ "dont-flash": true }, (timer) => {
			timer.skipInterval();
		});
		intervalTimer.skipInterval();

		expect(notifier).toHaveBeenCalledTimes(2);
		expect(notifier).toHaveBeenNthCalledWith(
			1,
			"☕️  Time for a short break",
			{
				state: "shortBreak",
				callContext: { "dont-flash": true },
			},
		);
		expect(notifier).toHaveBeenNthCalledWith(
			2,
			"⏰  Now it's time to focus",
			{
				state: "focus",
				callContext: {},
			},
		);

		intervalTimer.dispose();
	});
});
