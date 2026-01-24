import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { IntervalTimer, IntervalTimerSetting } from "./intervalTimer";

describe("IntervalTimer", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
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

		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			expect.objectContaining({ minutes: 25, seconds: 0 }),
			expect.objectContaining({ set: 0, total: 0 }),
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
});
