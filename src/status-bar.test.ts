import { beforeEach, describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { Menu } from "./obsidian-fake";
import { StatusBar } from "./status-bar";
import { IntervalTimer, IntervalTimerSetting } from "./interval-timer";
import { RetimeModal } from "./retime-modal";

describe("StatusBar", () => {
	beforeEach(() => {
		Menu.instances = [];
	});

	const settings: IntervalTimerSetting = {
		focusIntervalDuration: 25,
		shortBreakDuration: 5,
		longBreakDuration: 15,
		longBreakAfter: 4,
		resetTime: { hours: 0, minutes: 0 },
	};

	it("renders the time and interval count", () => {
		// Arrange
		const el = createDiv();
		const statusBar = new StatusBar(el, {} as App);

		// Act
		statusBar.update(
			{ total: 4, set: 2 },
			{ minutes: 7, seconds: 5 },
			"focus",
			"running",
		);

		// Assert
		expect(el.textContent).toBe("2/4 07:05");
	});

	it("shows the separator as running while the timer is running", () => {
		// Arrange
		const el = createDiv();
		const statusBar = new StatusBar(el, {} as App);

		// Act
		statusBar.update(
			{ total: 4, set: 0 },
			{ minutes: 0, seconds: 0 },
			"focus",
			"running",
		);

		// Assert
		const separator = el.querySelector(".interval-timer-time-separator");
		expect(
			separator?.classList.contains(
				"interval-timer-time-separator-running",
			),
		).toBe(true);
	});

	it("does not show the separator as running once the timer is paused", () => {
		// Arrange
		const el = createDiv();
		const statusBar = new StatusBar(el, {} as App);
		statusBar.update(
			{ total: 4, set: 0 },
			{ minutes: 0, seconds: 0 },
			"focus",
			"running",
		);

		// Act
		statusBar.update(
			{ total: 4, set: 0 },
			{ minutes: 0, seconds: 0 },
			"focus",
			"paused",
		);

		// Assert
		const separator = el.querySelector(".interval-timer-time-separator");
		expect(
			separator?.classList.contains(
				"interval-timer-time-separator-running",
			),
		).toBe(false);
	});

	it("sets the tooltip to the currently tracked task name", () => {
		// Arrange
		const el = createDiv();
		const statusBar = new StatusBar(el, {} as App);

		// Act
		statusBar.updateTrackedTaskTooltip("Write report");

		// Assert
		expect(el.getAttribute("aria-label")).toBe("Write report");
	});

	it("calls touch on a left click once clicking is enabled", () => {
		// Arrange
		const el = createDiv();
		const statusBar = new StatusBar(el, {} as App);
		const intervalTimer = new IntervalTimer(
			() => {},
			settings,
			() => {},
		);
		const touchSpy = vi.spyOn(intervalTimer, "touch");
		statusBar.enableClick(intervalTimer);

		// Act
		el.dispatchEvent(new MouseEvent("click", { button: 0, bubbles: true }));

		// Assert
		expect(touchSpy).toHaveBeenCalledOnce();

		intervalTimer.dispose();
	});

	it("resets the intervals set from the context menu", () => {
		// Arrange
		const el = createDiv();
		const statusBar = new StatusBar(el, {} as App);
		const intervalTimer = new IntervalTimer(
			() => {},
			settings,
			() => {},
		);
		const resetSpy = vi.spyOn(intervalTimer, "resetIntervalsSet");
		statusBar.enableClick(intervalTimer);

		// Act
		el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
		const menu = Menu.instances[Menu.instances.length - 1];
		const resetItem = menu?.items.find(
			(item) => item.title === "Reset intervals set",
		);
		resetItem?.trigger();

		// Assert
		expect(resetSpy).toHaveBeenCalledOnce();

		intervalTimer.dispose();
	});

	it("opens the retime modal from the context menu", () => {
		// Arrange
		const el = createDiv();
		const statusBar = new StatusBar(el, {} as App);
		const intervalTimer = new IntervalTimer(
			() => {},
			settings,
			() => {},
		);
		const openSpy = vi.spyOn(RetimeModal.prototype, "open");
		statusBar.enableClick(intervalTimer);

		// Act
		el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
		const menu = Menu.instances[Menu.instances.length - 1];
		const retimeItem = menu?.items.find(
			(item) => item.title === "Retime timer",
		);
		retimeItem?.trigger();

		// Assert
		expect(openSpy).toHaveBeenCalledOnce();

		openSpy.mockRestore();
		intervalTimer.dispose();
	});
});
