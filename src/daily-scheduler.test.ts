import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DailyScheduler } from "./daily-scheduler";

describe("DailyScheduler", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should execute callback when scheduled time is reached", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 9, 0, 0, 0)); // 09:00
		const callback = vi.fn();
		const scheduler = new DailyScheduler( // Scheduled at 10:00
			{ hours: 10, minutes: 0 },
			callback,
		);
		scheduler.enable();
		callback.mockClear();

		// Act
		vi.advanceTimersByTime(3600 * 1000); // Advance 1 hour to 10:00

		// Assert
		expect(callback).toHaveBeenCalledTimes(1);

		scheduler.disable();
	});

	it("should not execute immediately if scheduled time has already passed", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 10, 30, 0, 0)); // 10:30
		const callback = vi.fn();
		const scheduler = new DailyScheduler( // Scheduled at 10:00
			{ hours: 10, minutes: 0 },
			callback,
		);

		// Act
		scheduler.enable();
		vi.advanceTimersByTime(1000); // Advance 1 second to 10:30:01

		// Assert - Should not execute today, waits until tomorrow
		expect(callback).not.toHaveBeenCalled();

		scheduler.disable();
	});

	it("should not execute before scheduled time", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 9, 0, 0, 0)); // 09:00
		const callback = vi.fn();
		const scheduler = new DailyScheduler( // Scheduled at 10:00
			{ hours: 10, minutes: 0 },
			callback,
		);
		scheduler.enable();
		callback.mockClear();

		// Act
		vi.advanceTimersByTime(30 * 60 * 1000); // Advance 30 minutes to 09:30

		// Assert
		expect(callback).not.toHaveBeenCalled();

		scheduler.disable();
	});

	it("should execute only once per day", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 9, 59, 0, 0)); // 09:59
		const callback = vi.fn();
		const scheduler = new DailyScheduler( // Scheduled at 10:00
			{ hours: 10, minutes: 0 },
			callback,
		);
		scheduler.enable();
		callback.mockClear();

		// Act
		vi.advanceTimersByTime(60 * 1000 + 3000); // Advance 1 minute to 10:00 + 3 seconds

		// Assert
		expect(callback).toHaveBeenCalledTimes(1);

		scheduler.disable();
	});

	it("should execute on next day when enabled after scheduled time", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 10, 30, 0, 0)); // Day 1, 10:30
		const callback = vi.fn();
		const scheduler = new DailyScheduler( // Scheduled at 10:00
			{ hours: 10, minutes: 0 },
			callback,
		);
		scheduler.enable(); // Does NOT execute on Day 1 (already past 10:00)

		// Act - Move to next day and cross scheduled time
		vi.advanceTimersByTime(23 * 60 * 60 * 1000 + 30 * 60 * 1000); // Advance 23.5 hours to Day 2, 10:00

		// Assert - Should execute once on Day 2 only
		expect(callback).toHaveBeenCalledTimes(1);

		scheduler.disable();
	});

	it("should not execute after disable is called", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 9, 0, 0, 0)); // 09:00
		const callback = vi.fn();
		const scheduler = new DailyScheduler( // Scheduled at 10:00
			{ hours: 10, minutes: 0 },
			callback,
		);
		scheduler.enable();
		callback.mockClear();

		// Act
		scheduler.disable();
		vi.advanceTimersByTime(3600 * 1000); // Advance 1 hour to 10:00

		// Assert
		expect(callback).not.toHaveBeenCalled();
	});

	it("should handle midnight (00:00) scheduled time correctly", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 23, 59, 0, 0)); // 23:59
		const callback = vi.fn();
		const scheduler = new DailyScheduler( // Scheduled at 00:00
			{ hours: 0, minutes: 0 },
			callback,
		);
		scheduler.enable();
		callback.mockClear();

		// Act
		vi.advanceTimersByTime(60 * 1000); // Advance 1 minute to 00:00

		// Assert
		expect(callback).toHaveBeenCalledTimes(1);

		scheduler.disable();
	});

	it("should execute only once even when enable is called multiple times", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 9, 0, 0, 0)); // 09:00
		const callback = vi.fn();
		const scheduler = new DailyScheduler( // Scheduled at 10:00
			{ hours: 10, minutes: 0 },
			callback,
		);

		// Act
		scheduler.enable();
		scheduler.enable();
		scheduler.enable();

		vi.advanceTimersByTime(3600 * 1000); // Advance 1 hour to 10:00

		// Assert - Should execute only once, not multiple times
		expect(callback).toHaveBeenCalledTimes(1);

		scheduler.disable();
	});

	it("should execute after re-enabling following disable", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 9, 30, 0, 0)); // 09:30
		const callback = vi.fn();
		const scheduler = new DailyScheduler(
			{ hours: 10, minutes: 0 },
			callback,
		);
		scheduler.enable();
		callback.mockClear();

		// Act
		scheduler.disable();
		scheduler.enable();
		vi.advanceTimersByTime(30 * 60 * 1000); // Advance to 10:00

		// Assert
		expect(callback).toHaveBeenCalledTimes(1);

		scheduler.disable();
	});

	it("should execute only once when system time jumps forward by multiple days", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 9, 0, 0, 0)); // Jan 1, 09:00
		const callback = vi.fn();
		const scheduler = new DailyScheduler( // Scheduled at 10:00
			{ hours: 10, minutes: 0 },
			callback,
		);
		scheduler.enable();
		callback.mockClear();

		// Act - Simulate system time jump (e.g., laptop sleep, clock adjustment)
		vi.setSystemTime(new Date(2024, 0, 6, 10, 0, 0, 0)); // Jan 6, 10:00
		vi.advanceTimersByTime(1000);

		// Assert
		expect(callback).toHaveBeenCalledTimes(1);

		scheduler.disable();
	});
});
