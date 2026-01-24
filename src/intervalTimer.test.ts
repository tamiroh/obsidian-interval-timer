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
		// Arrange
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

		// Act
		intervalTimer.start();

		// Assert
		expect(handleIntervalCreated).toHaveBeenCalledTimes(1);
		intervalTimer.stopDateCheck();
	});

	it("should reset intervals when reset time is passed", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0));
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

		// Act
		vi.advanceTimersByTime(1000);
		vi.advanceTimersByTime(60000);

		// Assert
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			expect.objectContaining({ minutes: 25, seconds: 0 }),
			expect.objectContaining({ set: 0, total: 0 }),
		);
		intervalTimer.stopDateCheck();
	});

	it("should not reset before reset time is passed", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 23, 58, 0, 0));
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
		handleChangeState.mockClear();

		// Act
		vi.advanceTimersByTime(1000);
		vi.advanceTimersByTime(60000);

		// Assert
		expect(handleChangeState).not.toHaveBeenCalled();
		intervalTimer.stopDateCheck();
	});

	it("should pause and resume timer correctly", () => {
		// Arrange
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
		);
		intervalTimer.start();
		vi.advanceTimersByTime(5000);

		// Act
		intervalTimer.pause();

		// Assert
		expect(handleChangeState).toHaveBeenCalledWith(
			"paused",
			"focus",
			expect.any(Object),
			expect.any(Object),
		);
		intervalTimer.stopDateCheck();
	});

	it("should reset to initial state", () => {
		// Arrange
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
		);
		intervalTimer.start();
		vi.advanceTimersByTime(5000);
		handleChangeState.mockClear();

		// Act
		intervalTimer.reset();

		// Assert
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			{ minutes: 25, seconds: 0 },
			expect.any(Object),
		);
		intervalTimer.stopDateCheck();
	});

	it("should transition from focus to short break", () => {
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
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			notifier,
		);
		intervalTimer.start();

		// Act
		for (let i = 0; i < 60; i += 1) {
			vi.advanceTimersByTime(1000);
		}
		vi.advanceTimersByTime(1000);

		// Assert
		expect(notifier).toHaveBeenCalledWith("☕️  Time for a short break");
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"shortBreak",
			{ minutes: 5, seconds: 0 },
			{ set: 1, total: 1 },
		);
		intervalTimer.stopDateCheck();
	});

	it("should transition to long break after configured number of focus intervals", () => {
		// Arrange
		const handleChangeState = vi.fn();
		const notifier = vi.fn();
		const settings: IntervalTimerSetting = {
			focusIntervalDuration: 1,
			shortBreakDuration: 1,
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
		);

		// Act
		intervalTimer.start();
		for (let i = 0; i < 61; i += 1) {
			vi.advanceTimersByTime(1000);
		}
		intervalTimer.start();
		for (let i = 0; i < 61; i += 1) {
			vi.advanceTimersByTime(1000);
		}
		intervalTimer.start();
		for (let i = 0; i < 61; i += 1) {
			vi.advanceTimersByTime(1000);
		}

		// Assert
		expect(notifier).toHaveBeenCalledWith("🏖️  Time for a long break");
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"longBreak",
			{ minutes: 15, seconds: 0 },
			{ set: 0, total: 2 },
		);
		intervalTimer.stopDateCheck();
	});

	it("should reset intervals set", () => {
		// Arrange
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
			{
				focusIntervals: { total: 5, set: 2 },
			},
		);

		// Act
		intervalTimer.resetIntervalsSet();

		// Assert
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"longBreak",
			{ minutes: 15, seconds: 0 },
			{ set: 0, total: 5 },
		);
		intervalTimer.stopDateCheck();
	});

	it("should reset total intervals", () => {
		// Arrange
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
			{
				focusIntervals: { total: 10, set: 3 },
				state: "shortBreak",
			},
		);
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
		intervalTimer.stopDateCheck();
	});

	it("should skip current interval", () => {
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
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			notifier,
		);
		intervalTimer.start();
		vi.advanceTimersByTime(5000);
		handleChangeState.mockClear();
		notifier.mockClear();

		// Act
		intervalTimer.skipInterval();

		// Assert
		expect(notifier).toHaveBeenCalledWith("☕️  Time for a short break");
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"shortBreak",
			{ minutes: 5, seconds: 0 },
			{ set: 1, total: 1 },
		);
		intervalTimer.stopDateCheck();
	});

	it("should handle touch when timer is initialized", () => {
		// Arrange
		const handleChangeState = vi.fn();
		const handleIntervalCreated = vi.fn();
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
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
		);

		// Act
		intervalTimer.touch();

		// Assert
		expect(handleIntervalCreated).toHaveBeenCalledTimes(1);
		intervalTimer.stopDateCheck();
	});

	it("should handle touch when timer is running in focus state - should reset", () => {
		// Arrange
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
		);
		intervalTimer.start();
		vi.advanceTimersByTime(5000);
		handleChangeState.mockClear();

		// Act
		intervalTimer.touch();

		// Assert
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			{ minutes: 25, seconds: 0 },
			expect.any(Object),
		);
		intervalTimer.stopDateCheck();
	});

	it("should handle touch when timer is running in break state - should skip", () => {
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
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			notifier,
		);
		intervalTimer.start();
		for (let i = 0; i < 61; i += 1) {
			vi.advanceTimersByTime(1000);
		}
		intervalTimer.start();
		vi.advanceTimersByTime(2000);
		handleChangeState.mockClear();
		notifier.mockClear();

		// Act
		intervalTimer.touch();

		// Assert
		expect(notifier).toHaveBeenCalledWith("⏰  Now it's time to focus");
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			{ minutes: 1, seconds: 0 },
			{ set: 1, total: 1 },
		);
		intervalTimer.stopDateCheck();
	});

	it("should initialize with custom parameters", () => {
		// Arrange
		const handleChangeState = vi.fn();
		const settings: IntervalTimerSetting = {
			focusIntervalDuration: 25,
			shortBreakDuration: 5,
			longBreakDuration: 15,
			longBreakAfter: 4,
			notificationStyle: "simple",
			resetTime: { hours: 0, minutes: 0 },
		};

		// Act
		const intervalTimer = new IntervalTimer(
			handleChangeState,
			settings,
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			{
				minutes: 10,
				seconds: 30,
				state: "shortBreak",
				focusIntervals: { total: 5, set: 2 },
			},
		);

		// Assert
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"shortBreak",
			{ minutes: 10, seconds: 30 },
			{ set: 2, total: 5 },
		);
		intervalTimer.stopDateCheck();
	});

	it("should handle reset time at different hour of the day", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 17, 59, 0, 0));
		const handleChangeState = vi.fn();
		const intervalTimer = new IntervalTimer(
			handleChangeState,
			{
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 18, minutes: 0 },
			},
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
		);

		// Act
		vi.advanceTimersByTime(1000);
		vi.advanceTimersByTime(60000);

		// Assert
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			expect.objectContaining({ minutes: 25, seconds: 0 }),
			expect.objectContaining({ set: 0, total: 0 }),
		);
		intervalTimer.stopDateCheck();
	});

	it("should handle reset time with specific minutes", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 8, 29, 0, 0));
		const handleChangeState = vi.fn();
		const intervalTimer = new IntervalTimer(
			handleChangeState,
			{
				focusIntervalDuration: 25,
				shortBreakDuration: 5,
				longBreakDuration: 15,
				longBreakAfter: 4,
				notificationStyle: "simple",
				resetTime: { hours: 8, minutes: 30 },
			},
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
		);

		// Act
		vi.advanceTimersByTime(1000);
		vi.advanceTimersByTime(60000);

		// Assert
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			expect.objectContaining({ minutes: 25, seconds: 0 }),
			expect.objectContaining({ set: 0, total: 0 }),
		);
		intervalTimer.stopDateCheck();
	});

	it("should transition from long break back to focus", () => {
		// Arrange
		const handleChangeState = vi.fn();
		const notifier = vi.fn();
		const settings: IntervalTimerSetting = {
			focusIntervalDuration: 25,
			shortBreakDuration: 5,
			longBreakDuration: 1,
			longBreakAfter: 4,
			notificationStyle: "simple",
			resetTime: { hours: 0, minutes: 0 },
		};
		const intervalTimer = new IntervalTimer(
			handleChangeState,
			settings,
			() => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			notifier,
			{
				minutes: 1,
				seconds: 0,
				state: "longBreak",
			},
		);

		// Act
		intervalTimer.start();
		for (let i = 0; i < 61; i += 1) {
			vi.advanceTimersByTime(1000);
		}

		// Assert
		expect(notifier).toHaveBeenCalledWith("⏰  Now it's time to focus");
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			{ minutes: 25, seconds: 0 },
			expect.any(Object),
		);

		intervalTimer.stopDateCheck();
	});
});
