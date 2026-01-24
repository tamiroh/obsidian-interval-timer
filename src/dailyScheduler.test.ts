import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DailyScheduler } from "./dailyScheduler";

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

	it("should execute immediately if scheduled time has already passed", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 10, 30, 0, 0)); // 10:30
		const callback = vi.fn();
		const scheduler = new DailyScheduler( // Scheduled at 10:00
			{ hours: 10, minutes: 0 },
			callback,
		);

		// Act
		scheduler.enable();

		// Assert - Should execute immediately during enable()
		expect(callback).toHaveBeenCalledTimes(1);

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

	it("should execute again on next day after scheduled time", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 10, 30, 0, 0)); // Day 1, 10:30
		const callback = vi.fn();
		const scheduler = new DailyScheduler( // Scheduled at 10:00
			{ hours: 10, minutes: 0 },
			callback,
		);
		scheduler.enable(); // Executes once on Day 1

		// Act - Move to next day and cross scheduled time
		vi.setSystemTime(new Date(2024, 0, 2, 10, 0, 0, 0)); // Day 2, 10:00
		vi.advanceTimersByTime(1000);

		// Assert - Should execute twice: once on Day 1, once on Day 2
		expect(callback).toHaveBeenCalledTimes(2);

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

	it("should not execute multiple times when enable is called multiple times", () => {
		// Arrange
		vi.setSystemTime(new Date(2024, 0, 1, 10, 30, 0, 0)); // 10:30
		const callback = vi.fn();
		const scheduler = new DailyScheduler( // Scheduled at 10:00
			{ hours: 10, minutes: 0 },
			callback,
		);

		// Act
		scheduler.enable();
		scheduler.enable();
		scheduler.enable();

		// Assert - Should only execute once (from the last enable call)
		expect(callback).toHaveBeenCalledTimes(1);

		scheduler.disable();
	});
});
