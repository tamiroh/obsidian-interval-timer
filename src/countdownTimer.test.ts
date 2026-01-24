import { describe, expect, it, vi } from "vitest";
import { CountdownTimer } from "./countdownTimer";

describe("CountdownTimer", () => {
	it("should call handleSubtract when subtracted", () => {
		// Arrange
		vi.useFakeTimers();
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
		vi.advanceTimersToNextTimer();

		// Assert
		expect(result).toStrictEqual({ type: "succeeded" });
		expect(handleSubtract).toHaveBeenCalledTimes(1);
		expect(countdownTimer.getIntervalId()).not.toBeUndefined();
	});
	it("should call handleComplete after specified minutes and seconds", () => {
		// Arrange
		vi.useFakeTimers();
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
		for (let i = 0; i < 60; i += 1) {
			vi.advanceTimersByTime(1000);
			expect(handleSubtract).toHaveBeenCalledWith({
				minutes: 0,
				seconds: 59 - i,
			});
		}
		vi.advanceTimersByTime(1000);

		// Assert
		expect(handleComplete).toHaveBeenCalledOnce();
	});
	it("should pause when pause is called", () => {
		// Arrange
		vi.useFakeTimers();
		const handleSubtract = vi.fn();
		const handlePause = vi.fn();
		const handleComplete = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			handleSubtract,
			handlePause,
			handleComplete,
		);
		countdownTimer.start();
		vi.advanceTimersByTime(1000 * 3);

		// Act
		const result = countdownTimer.pause();
		const subtractedCount = handleSubtract.mock.calls.length;
		vi.advanceTimersByTime(1000 * 60);

		// Assert
		expect(result).toStrictEqual({ type: "succeeded" });
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
		vi.useFakeTimers();
		const handleComplete = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 1 },
			vi.fn(),
			vi.fn(),
			handleComplete,
		);
		countdownTimer.start();
		vi.advanceTimersByTime(2000);

		// Act
		const result = countdownTimer.start();

		// Assert
		expect(handleComplete).toHaveBeenCalledOnce();
		expect(result).toStrictEqual({ type: "failed" });
	});

	it("should reset timer to initial state", () => {
		// Arrange
		vi.useFakeTimers();
		const handleSubtract = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 5, seconds: 30 },
			handleSubtract,
			vi.fn(),
			vi.fn(),
		);
		countdownTimer.start();
		vi.advanceTimersByTime(10000);

		// Act
		const result = countdownTimer.reset();

		// Assert
		expect(result).toStrictEqual({
			type: "succeeded",
			resetTo: { minutes: 5, seconds: 30 },
		});
		expect(countdownTimer.getCurrentTimerType()).toBe("initialized");
	});

	it("should reset timer from paused state", () => {
		// Arrange
		vi.useFakeTimers();
		const countdownTimer = new CountdownTimer(
			{ minutes: 10, seconds: 0 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);
		countdownTimer.start();
		vi.advanceTimersByTime(5000);
		countdownTimer.pause();

		// Act
		const result = countdownTimer.reset();

		// Assert
		expect(result).toStrictEqual({
			type: "succeeded",
			resetTo: { minutes: 10, seconds: 0 },
		});
		expect(countdownTimer.getCurrentTimerType()).toBe("initialized");
	});

	it("should reset timer from completed state", () => {
		// Arrange
		vi.useFakeTimers();
		const handleComplete = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 1 },
			vi.fn(),
			vi.fn(),
			handleComplete,
		);
		countdownTimer.start();
		vi.advanceTimersByTime(2000);

		// Act
		const result = countdownTimer.reset();

		// Assert
		expect(handleComplete).toHaveBeenCalledOnce();
		expect(result).toStrictEqual({
			type: "succeeded",
			resetTo: { minutes: 0, seconds: 1 },
		});
		expect(countdownTimer.getCurrentTimerType()).toBe("initialized");
	});

	it("should resume from paused state correctly", () => {
		// Arrange
		vi.useFakeTimers();
		const handleSubtract = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			handleSubtract,
			vi.fn(),
			vi.fn(),
		);
		countdownTimer.start();
		vi.advanceTimersByTime(10000);
		countdownTimer.pause();
		const pausedCallCount = handleSubtract.mock.calls.length;

		// Act
		countdownTimer.start();
		vi.advanceTimersByTime(1000);

		// Assert
		expect(handleSubtract.mock.calls.length).toBeGreaterThan(
			pausedCallCount,
		);
	});

	it("should not pause when timer is not running", () => {
		// Arrange
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		// Act
		const result = countdownTimer.pause();

		// Assert
		expect(result).toStrictEqual({ type: "failed" });
	});

	it("should handle countdown with only seconds", () => {
		// Arrange
		vi.useFakeTimers();
		const handleSubtract = vi.fn();
		const handleComplete = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 5 },
			handleSubtract,
			vi.fn(),
			handleComplete,
		);

		// Act
		countdownTimer.start();
		for (let i = 0; i < 5; i += 1) {
			vi.advanceTimersByTime(1000);
			expect(handleSubtract).toHaveBeenCalledWith({
				minutes: 0,
				seconds: 4 - i,
			});
		}
		vi.advanceTimersByTime(1000);

		// Assert
		expect(handleComplete).toHaveBeenCalledOnce();
	});

	it("should handle countdown with minutes and seconds", () => {
		// Arrange
		vi.useFakeTimers();
		const handleSubtract = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 30 },
			handleSubtract,
			vi.fn(),
			vi.fn(),
		);

		// Act
		countdownTimer.start();
		vi.advanceTimersByTime(1000);
		vi.advanceTimersByTime(30000);

		// Assert
		expect(handleSubtract).toHaveBeenCalledWith({
			minutes: 1,
			seconds: 29,
		});
		expect(handleSubtract).toHaveBeenCalledWith({
			minutes: 0,
			seconds: 59,
		});
	});

	it("should return undefined intervalId when not running", () => {
		// Arrange
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		// Act
		const intervalId = countdownTimer.getIntervalId();

		// Assert
		expect(intervalId).toBeUndefined();
	});

	it("should return intervalId when running", () => {
		// Arrange
		vi.useFakeTimers();
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		// Act
		countdownTimer.start();
		const intervalId = countdownTimer.getIntervalId();

		// Assert
		expect(intervalId).toBeDefined();
		expect(intervalId).not.toBeUndefined();
	});

	it("should have correct timer type during lifecycle", () => {
		// Arrange
		vi.useFakeTimers();
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 1 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		// Act & Assert
		expect(countdownTimer.getCurrentTimerType()).toBe("initialized");

		countdownTimer.start();
		expect(countdownTimer.getCurrentTimerType()).toBe("running");

		countdownTimer.pause();
		expect(countdownTimer.getCurrentTimerType()).toBe("paused");

		countdownTimer.start();
		vi.advanceTimersByTime(2000);
		expect(countdownTimer.getCurrentTimerType()).toBe("completed");
	});
});
