import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CountdownTimer } from "./countdown-timer";
import { Seconds } from "./time";

describe("CountdownTimer", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should call handleSubtract when subtracted", () => {
		// Arrange
		const handleSubtract = vi.fn();
		const handlePause = vi.fn();
		const handleComplete = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			handleSubtract,
			handlePause,
			handleComplete,
		);

		// Act
		const result = countdownTimer.start();
		vi.advanceTimersByTime(1000);

		// Assert
		expect(result).toStrictEqual({ type: "succeeded" });
		expect(handleSubtract).toHaveBeenCalledTimes(1);
		expect(countdownTimer.getIntervalId()).not.toBeUndefined();
	});

	it("should call handleSubtract after one second", () => {
		// Arrange
		const handleSubtract = vi.fn();
		const handlePause = vi.fn();
		const handleComplete = vi.fn();
		new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			handleSubtract,
			handlePause,
			handleComplete,
		).start();

		// Act
		vi.advanceTimersByTime(1000);

		// Assert
		expect(handleSubtract).toHaveBeenCalledTimes(1);
		expect(handleSubtract).toHaveBeenLastCalledWith({
			minutes: 0,
			seconds: 59,
		});
	});

	it("should call handleSubtract just before completion", () => {
		// Arrange
		const handleSubtract = vi.fn();
		const handlePause = vi.fn();
		const handleComplete = vi.fn();
		new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			handleSubtract,
			handlePause,
			handleComplete,
		).start();

		// Act
		vi.advanceTimersByTime(60000);

		// Assert
		expect(handleSubtract).toHaveBeenCalledTimes(60);
		expect(handleSubtract).toHaveBeenLastCalledWith({
			minutes: 0,
			seconds: 0,
		});
	});

	it("should call handleComplete after specified minutes and seconds", () => {
		// Arrange
		const handleSubtract = vi.fn();
		const handlePause = vi.fn();
		const handleComplete = vi.fn();
		new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			handleSubtract,
			handlePause,
			handleComplete,
		).start();

		// Act
		vi.advanceTimersByTime(61000);

		// Assert
		expect(handleComplete).toHaveBeenCalledOnce();
	});

	it("should call handleComplete only once even when time is advanced far past completion", () => {
		// Arrange
		const handleComplete = vi.fn();
		new CountdownTimer(
			{ minutes: 0, seconds: 1 },
			vi.fn(),
			vi.fn(),
			handleComplete,
		).start();

		// Act
		vi.advanceTimersByTime(5000);

		// Assert
		expect(handleComplete).toHaveBeenCalledOnce();
	});

	it("should complete immediately when remaining time reaches zero", () => {
		// Arrange
		const handleComplete = vi.fn();
		new CountdownTimer(
			{ minutes: 0, seconds: 1 },
			vi.fn(),
			vi.fn(),
			handleComplete,
		).start();

		// Act
		vi.advanceTimersByTime(999);
		const calledBeforeLastMillisecond = handleComplete.mock.calls.length;
		vi.advanceTimersByTime(1);

		// Assert
		expect(calledBeforeLastMillisecond).toBe(0);
		expect(handleComplete).toHaveBeenCalledOnce();
	});

	it("should call handleSubtract with 00:00 only once", () => {
		// Arrange
		const handleSubtract = vi.fn();
		new CountdownTimer(
			{ minutes: 0, seconds: 1 },
			handleSubtract,
			vi.fn(),
			vi.fn(),
		).start();

		// Act
		vi.advanceTimersByTime(5000);
		const zeroCalls = handleSubtract.mock.calls.filter(
			([time]) => time.minutes === 0 && time.seconds === 0,
		);

		// Assert
		expect(zeroCalls).toHaveLength(1);
	});

	it("should pause when pause is called", () => {
		// Arrange
		const handleSubtract = vi.fn();
		const handlePause = vi.fn();
		const handleComplete = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			handleSubtract,
			handlePause,
			handleComplete,
		);

		// Act
		countdownTimer.start();
		vi.advanceTimersByTime(1000 * 3);
		const result = countdownTimer.pause();
		const subtractedCount = handleSubtract.mock.calls.length;
		vi.advanceTimersByTime(1000 * 60);

		// Assert
		expect(result).toStrictEqual({ type: "succeeded" });
		// paused so subtract should not be called anymore
		expect(handleSubtract).toHaveBeenCalledTimes(subtractedCount);
	});

	it("should not start when timer is already running", () => {
		// Arrange
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		// Act
		const result = countdownTimer.start();
		const result2 = countdownTimer.start();

		// Assert
		expect(result).toStrictEqual({ type: "succeeded" });
		expect(result2).toStrictEqual({ type: "failed" });
	});

	it("should not start when timer is already completed", () => {
		// Arrange
		const handleComplete = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 1 },
			vi.fn(),
			vi.fn(),
			handleComplete,
		);

		// Act
		countdownTimer.start();
		vi.advanceTimersByTime(2000);
		const result = countdownTimer.start();

		// Assert
		expect(handleComplete).toHaveBeenCalledOnce();
		expect(result).toStrictEqual({ type: "failed" });
	});

	it("should fail to pause when not running", () => {
		// Arrange
		const handlePause = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 10 },
			vi.fn(),
			handlePause,
			vi.fn(),
		);

		// Act
		const result = countdownTimer.pause();

		// Assert
		expect(result).toStrictEqual({ type: "failed" });
		expect(handlePause).not.toHaveBeenCalled();
	});

	it("should fail to pause when completed", () => {
		// Arrange
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 1 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);
		countdownTimer.start();
		vi.advanceTimersByTime(2000);

		// Act
		const result = countdownTimer.pause();

		// Assert
		expect(result).toStrictEqual({ type: "failed" });
	});

	it("should report initialized timer type when created", () => {
		// Arrange
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 2 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		// Act & Assert
		expect(countdownTimer.getCurrentTimerType()).toBe("initialized");
	});

	it("should report running timer type after start", () => {
		// Arrange
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 2 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		// Act
		countdownTimer.start();

		// Assert
		expect(countdownTimer.getCurrentTimerType()).toBe("running");
	});

	it("should report paused timer type after pause", () => {
		// Arrange
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 2 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		// Act
		countdownTimer.start();
		countdownTimer.pause();

		// Assert
		expect(countdownTimer.getCurrentTimerType()).toBe("paused");
	});

	it("should report completed timer type after reaching zero", () => {
		// Arrange
		const handleComplete = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 2 },
			vi.fn(),
			vi.fn(),
			handleComplete,
		);

		// Act
		countdownTimer.start();
		vi.advanceTimersByTime(3000);

		// Assert
		expect(handleComplete).toHaveBeenCalledOnce();
		expect(countdownTimer.getCurrentTimerType()).toBe("completed");
	});

	it("should reset to the initial time from running state", () => {
		// Arrange
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 5 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		// Act
		countdownTimer.start();
		vi.advanceTimersByTime(1000);
		const result = countdownTimer.reset();

		// Assert
		expect(result).toStrictEqual({
			type: "succeeded",
			resetTo: { minutes: 0, seconds: 5 },
		});
		expect(countdownTimer.getCurrentTimerType()).toBe("initialized");
		expect(countdownTimer.getIntervalId()).toBeUndefined();
	});

	it("should start again after reset from completed state", () => {
		// Arrange
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 1 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);
		countdownTimer.start();
		vi.advanceTimersByTime(2000);
		countdownTimer.reset();

		// Act
		const result = countdownTimer.start();

		// Assert
		expect(result).toStrictEqual({ type: "succeeded" });
		expect(countdownTimer.getCurrentTimerType()).toBe("running");
	});

	it("should not subtract while paused", () => {
		// Arrange
		const handleSubtract = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 3 },
			handleSubtract,
			vi.fn(),
			vi.fn(),
		);

		// Act
		countdownTimer.start();
		vi.advanceTimersByTime(1000);
		const countBeforePause = handleSubtract.mock.calls.length;
		countdownTimer.pause();
		vi.advanceTimersByTime(2000);

		// Assert
		expect(countBeforePause).toBe(handleSubtract.mock.calls.length);
	});

	it("should resume from paused time when restarted", () => {
		// Arrange
		const handleSubtract = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 3 },
			handleSubtract,
			vi.fn(),
			vi.fn(),
		);

		// Act
		countdownTimer.start();
		vi.advanceTimersByTime(1000);
		countdownTimer.pause();
		const countAfterPause = handleSubtract.mock.calls.length;
		countdownTimer.start();
		vi.advanceTimersByTime(1000);

		// Assert
		expect(handleSubtract).toHaveBeenCalledTimes(countAfterPause + 1);
		expect(handleSubtract).toHaveBeenLastCalledWith({
			minutes: 0,
			seconds: 1,
		});
	});

	it("should expose interval id only while running", () => {
		// Arrange
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 3 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		// Act
		const initialIntervalId = countdownTimer.getIntervalId();
		countdownTimer.start();
		const runningIntervalId = countdownTimer.getIntervalId();
		countdownTimer.pause();
		const pausedIntervalId = countdownTimer.getIntervalId();

		// Assert
		expect(initialIntervalId).toBeUndefined();
		expect(runningIntervalId).not.toBeUndefined();
		expect(pausedIntervalId).toBeUndefined();
	});

	it("should not be affected by external mutation of initialTime", () => {
		// Arrange
		const handlePause = vi.fn();
		const initialTime = { minutes: 1, seconds: 0 as Seconds };
		const countdownTimer = new CountdownTimer(
			initialTime,
			vi.fn(),
			handlePause,
			vi.fn(),
		);

		// Act
		initialTime.minutes = 9;
		initialTime.seconds = 59;
		countdownTimer.start();
		countdownTimer.pause();

		// Assert
		expect(handlePause).toHaveBeenCalledWith({ minutes: 1, seconds: 0 });
	});
});
