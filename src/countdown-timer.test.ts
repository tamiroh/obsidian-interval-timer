import { describe, expect, it, vi } from "vitest";
import { CountdownTimer } from "./countdown-timer";

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
		new CountdownTimer(
			{ minutes: 1, seconds: 0 },
			handleSubtract,
			handlePause,
			handleComplete,
		).start();

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
		expect(result).toStrictEqual({ type: "succeeded" });

		vi.advanceTimersByTime(1000 * 60);

		// paused so subtract should not be called anymore
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
});
