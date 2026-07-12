import { beforeEach, describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { Notice } from "./obsidian-fake";
import { IntervalTimer, IntervalTimerSetting } from "./interval-timer";
import { RetimeModal } from "./retime-modal";

describe("RetimeModal", () => {
	beforeEach(() => {
		Notice.messages = [];
	});

	const settings: IntervalTimerSetting = {
		focusIntervalDuration: 25,
		shortBreakDuration: 5,
		longBreakDuration: 15,
		longBreakAfter: 4,
		resetTime: { hours: 0, minutes: 0 },
	};

	const applyMinutes = (modal: RetimeModal, minutes: string): void => {
		const input = modal.contentEl.querySelector("input");
		if (!input) throw new Error("input not found");
		input.value = minutes;

		const applyButton = modal.contentEl.querySelector("button");
		if (!applyButton) throw new Error("apply button not found");
		applyButton.click();
	};

	it("retimes and closes the modal for a valid whole number of minutes", () => {
		// Arrange
		const handleChangeState = vi.fn();
		const intervalTimer = new IntervalTimer(
			handleChangeState,
			settings,
			() => {},
		);
		const modal = new RetimeModal({} as App, intervalTimer);
		modal.onOpen();

		// Act
		applyMinutes(modal, "45");

		// Assert
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			{ minutes: 45, seconds: 0 },
			{ set: 0, total: 0 },
		);
		expect(Notice.messages).toEqual([]);
		expect(modal.contentEl.childElementCount).toBe(0);

		intervalTimer.dispose();
	});

	it("shows a notice and keeps the modal open for a non-integer input", () => {
		// Arrange
		const intervalTimer = new IntervalTimer(
			() => {},
			settings,
			() => {},
		);
		const modal = new RetimeModal({} as App, intervalTimer);
		modal.onOpen();

		// Act
		applyMinutes(modal, "1.5");

		// Assert
		expect(Notice.messages).toEqual([
			"Please enter a positive whole number of minutes.",
		]);
		expect(modal.contentEl.childElementCount).toBeGreaterThan(0);

		intervalTimer.dispose();
	});

	it("shows a notice when the timer is running", () => {
		// Arrange
		const intervalTimer = new IntervalTimer(
			() => {},
			settings,
			() => {},
		);
		intervalTimer.start();
		const modal = new RetimeModal({} as App, intervalTimer);
		modal.onOpen();

		// Act
		applyMinutes(modal, "10");

		// Assert
		expect(Notice.messages).toEqual([
			"Retime is available only when the timer is stopped.",
		]);

		intervalTimer.dispose();
	});
});
