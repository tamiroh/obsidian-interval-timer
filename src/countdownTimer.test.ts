import { describe, expect, it, vi } from "vitest";
import { CountdownTimer } from "./countdownTimer";

describe("CountdownTimer", () => {
	it("should call handleSubtract when subtracted", () => {
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

		const result = countdownTimer.start();
		vi.advanceTimersToNextTimer();

		expect(result).toStrictEqual({ type: "succeeded" });
		expect(handleSubtract).toHaveBeenCalledTimes(1);
		expect(countdownTimer.getIntervalId()).not.toBeUndefined();
	});
	it("should call handleComplete after specified minutes and seconds", () => {
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
		for (let i = 0; i < 60; i += 1) {
			vi.advanceTimersByTime(1000);
			expect(handleSubtract).toHaveBeenCalledWith({
				minutes: 0,
				seconds: 59 - i,
			});
		}
		vi.advanceTimersByTime(1000);

		expect(handleComplete).toHaveBeenCalledOnce();
	});
	it("should pause when pause is called", () => {
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

		const result = countdownTimer.pause();
		const subtractedCount = handleSubtract.mock.calls.length;
		vi.advanceTimersByTime(1000 * 60);

		expect(result).toStrictEqual({ type: "succeeded" });
		expect(handleSubtract).toHaveBeenCalledTimes(subtractedCount);
	});
	it("should not start when timer is already running", () => {
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		const result = countdownTimer.start();
		const result2 = countdownTimer.start();

		expect(result).toStrictEqual({ type: "succeeded" });
		expect(result2).toStrictEqual({ type: "failed" });
	});

	it("should not start when timer is already completed", () => {
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

		const result = countdownTimer.start();

		expect(handleComplete).toHaveBeenCalledOnce();
		expect(result).toStrictEqual({ type: "failed" });
	});

	it("should reset timer to initial state", () => {
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

		const result = countdownTimer.reset();

		expect(result).toStrictEqual({
			type: "succeeded",
			resetTo: { minutes: 5, seconds: 30 },
		});
		expect(countdownTimer.getCurrentTimerType()).toBe("initialized");
	});

	it("should reset timer from paused state", () => {
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

		const result = countdownTimer.reset();

		expect(result).toStrictEqual({
			type: "succeeded",
			resetTo: { minutes: 10, seconds: 0 },
		});
		expect(countdownTimer.getCurrentTimerType()).toBe("initialized");
	});

	it("should reset timer from completed state", () => {
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

		const result = countdownTimer.reset();

		expect(handleComplete).toHaveBeenCalledOnce();
		expect(result).toStrictEqual({
			type: "succeeded",
			resetTo: { minutes: 0, seconds: 1 },
		});
		expect(countdownTimer.getCurrentTimerType()).toBe("initialized");
	});

	it("should resume from paused state correctly", () => {
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

		countdownTimer.start();
		vi.advanceTimersByTime(1000);

		expect(handleSubtract.mock.calls.length).toBeGreaterThan(
			pausedCallCount,
		);
	});

	it("should not pause when timer is not running", () => {
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		const result = countdownTimer.pause();

		expect(result).toStrictEqual({ type: "failed" });
	});

	it("should handle countdown with only seconds", () => {
		vi.useFakeTimers();
		const handleSubtract = vi.fn();
		const handleComplete = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 5 },
			handleSubtract,
			vi.fn(),
			handleComplete,
		);

		countdownTimer.start();
		for (let i = 0; i < 5; i += 1) {
			vi.advanceTimersByTime(1000);
			expect(handleSubtract).toHaveBeenCalledWith({
				minutes: 0,
				seconds: 4 - i,
			});
		}
		vi.advanceTimersByTime(1000);

		expect(handleComplete).toHaveBeenCalledOnce();
	});

	it("should handle countdown with minutes and seconds", () => {
		vi.useFakeTimers();
		const handleSubtract = vi.fn();
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 30 },
			handleSubtract,
			vi.fn(),
			vi.fn(),
		);

		countdownTimer.start();
		vi.advanceTimersByTime(1000);
		vi.advanceTimersByTime(30000);

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
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		const intervalId = countdownTimer.getIntervalId();

		expect(intervalId).toBeUndefined();
	});

	it("should return intervalId when running", () => {
		vi.useFakeTimers();
		const countdownTimer = new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

		countdownTimer.start();
		const intervalId = countdownTimer.getIntervalId();

		expect(intervalId).toBeDefined();
		expect(intervalId).not.toBeUndefined();
	});

	it("should have correct timer type during lifecycle", () => {
		vi.useFakeTimers();
		const countdownTimer = new CountdownTimer(
			{ minutes: 0, seconds: 1 },
			vi.fn(),
			vi.fn(),
			vi.fn(),
		);

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
