import { fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntervalTimer, IntervalTimerSetting } from "./interval-timer";
import { Menu, Notice } from "./obsidian-fake";
import { StatusBarPopover } from "./status-bar-popover";

const popovers = new Set<StatusBarPopover>();

const createPopover = async (
	container: HTMLElement,
): Promise<StatusBarPopover> => {
	document.body.append(container);
	const popover = new StatusBarPopover(container);
	popovers.add(popover);
	await within(container).findByText("No task selected");
	return popover;
};

describe("StatusBarPopover", () => {
	const settings: IntervalTimerSetting = {
		focusIntervalDuration: 25,
		shortBreakDuration: 5,
		longBreakDuration: 15,
		longBreakAfter: 4,
		resetTime: { hours: 0, minutes: 0 },
	};

	beforeEach(() => {
		Menu.instances = [];
		Notice.messages = [];
	});

	afterEach(() => {
		popovers.forEach((popover) => popover.dispose());
		popovers.clear();
		document.body.replaceChildren();
	});

	it("renders the remaining time and empty task state", async () => {
		const el = createDiv();
		const popover = await createPopover(el);

		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");

		await waitFor(() =>
			expect(
				el.querySelector(".interval-timer-popover-clock-time"),
			).toHaveTextContent("07:05"),
		);
		expect(within(el).getByText("No task selected")).toBeInTheDocument();
		expect(el).not.toHaveTextContent("Remaining");
		expect(el).not.toHaveTextContent("Retime");
		expect(el).not.toHaveTextContent("Current task");
	});

	it("visualizes the remaining proportion", async () => {
		const el = createDiv();
		const popover = await createPopover(el);
		popover.update({ minutes: 25, seconds: 0 }, "focus", "initialized");

		popover.update({ minutes: 15, seconds: 0 }, "focus", "running");

		await waitFor(() =>
			expect(
				(
					el.querySelector(
						".interval-timer-popover-clock-value",
					) as SVGElement
				).style.strokeDashoffset,
			).toBe("-40"),
		);
	});

	it("uses the break color independently from the status bar", async () => {
		const el = createDiv();
		const popover = await createPopover(el);

		popover.update({ minutes: 5, seconds: 0 }, "shortBreak", "paused");

		await waitFor(() =>
			expect(el.querySelector(".interval-timer-popover")).toHaveClass(
				"interval-timer-popover-break",
			),
		);
		expect(el).not.toHaveClass("interval-timer-status-bar-break");
	});

	it("shows progress toward the next long break", async () => {
		const el = createDiv();
		const popover = await createPopover(el);

		popover.update(
			{ minutes: 25, seconds: 0 },
			"focus",
			"initialized",
			2,
			4,
		);

		await waitFor(() =>
			expect(
				el.querySelectorAll(
					".interval-timer-popover-set-ring-segment-filled",
				),
			).toHaveLength(2),
		);
		const markers = el.querySelectorAll(
			".interval-timer-popover-set-ring-segment",
		);
		expect(markers).toHaveLength(4);
		expect(getRotation(markers[0] as SVGCircleElement)).toBeCloseTo(
			-87.14,
			2,
		);
		expect(getRotation(markers[1] as SVGCircleElement)).toBeCloseTo(
			2.86,
			2,
		);
	});

	it("shows a completed set during a long break", async () => {
		const el = createDiv();
		const popover = await createPopover(el);

		popover.update(
			{ minutes: 15, seconds: 0 },
			"longBreak",
			"initialized",
			0,
			4,
		);

		await waitFor(() =>
			expect(
				el.querySelectorAll(
					".interval-timer-popover-set-ring-segment-filled",
				),
			).toHaveLength(4),
		);
	});

	it("updates the tracked task", async () => {
		const el = createDiv();
		const popover = await createPopover(el);

		popover.updateTrackedTask("Write report");

		expect(await within(el).findByText("Write report")).toBeInTheDocument();
	});

	it("resets the intervals set from the integrated action", async () => {
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		const resetSpy = vi.spyOn(intervalTimer, "resetIntervalsSet");
		popover.enableActions(intervalTimer);
		await waitFor(() =>
			expect(
				within(el).getByRole("button", { name: "Start" }),
			).toBeEnabled(),
		);

		await user.click(
			await within(el).findByRole("button", { name: "Reset set" }),
		);

		expect(resetSpy).toHaveBeenCalledOnce();
		intervalTimer.dispose();
	});

	it("starts the timer from the integrated action", async () => {
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		const startSpy = vi.spyOn(intervalTimer, "start");
		const start = within(el).getByRole("button", { name: "Start" });
		expect(start).toBeDisabled();
		popover.enableActions(intervalTimer);
		await waitFor(() => expect(start).toBeEnabled());

		await user.click(start);

		expect(startSpy).toHaveBeenCalledOnce();
		intervalTimer.dispose();
	});

	it("turns the remaining time into an inline field", async () => {
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");
		popover.enableActions(intervalTimer);

		await user.click(await within(el).findByRole("button", { name: "07" }));

		const input = getRetimeInput(el);
		expect(input).toHaveValue(7);
		expect(input).toHaveFocus();
		expect(
			el.querySelector(".interval-timer-popover-retime-editor"),
		).toHaveClass("interval-timer-popover-retime-editor-editing");
		expect(within(el).getByText("05")).toBeInTheDocument();
		intervalTimer.dispose();
	});

	it("applies a time edited in place", async () => {
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const handleChangeState = vi.fn();
		const intervalTimer = new IntervalTimer(
			handleChangeState,
			settings,
			() => {},
		);
		handleChangeState.mockClear();
		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");
		popover.enableActions(intervalTimer);
		await user.click(await within(el).findByRole("button", { name: "07" }));

		await user.clear(getRetimeInput(el));
		await user.type(getRetimeInput(el), "12");
		fireEvent.submit(getRetimeForm(el));

		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			{ minutes: 12, seconds: 0 },
			{ set: 0, total: 0 },
		);
		expect(Notice.messages).toEqual([]);
		expect(
			el.querySelector(".interval-timer-popover-retime-editor"),
		).not.toHaveClass("interval-timer-popover-retime-editor-editing");
		intervalTimer.dispose();
	});

	it("applies an edited time on focusout", async () => {
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const handleChangeState = vi.fn();
		const intervalTimer = new IntervalTimer(
			handleChangeState,
			settings,
			() => {},
		);
		handleChangeState.mockClear();
		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");
		popover.enableActions(intervalTimer);
		await user.click(await within(el).findByRole("button", { name: "07" }));

		await user.clear(getRetimeInput(el));
		await user.type(getRetimeInput(el), "18");
		await user.tab();

		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			{ minutes: 18, seconds: 0 },
			{ set: 0, total: 0 },
		);
		expect(
			el.querySelector(".interval-timer-popover-retime-editor"),
		).not.toHaveClass("interval-timer-popover-retime-editor-editing");
		intervalTimer.dispose();
	});

	it("keeps editing when the inline time is invalid", async () => {
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");
		popover.enableActions(intervalTimer);
		await user.click(await within(el).findByRole("button", { name: "07" }));

		await user.clear(getRetimeInput(el));
		await user.type(getRetimeInput(el), "1.5");
		fireEvent.submit(getRetimeForm(el));

		expect(Notice.messages).toEqual([
			"Enter a positive whole number of minutes.",
		]);
		expect(
			el.querySelector(".interval-timer-popover-retime-editor"),
		).toHaveClass("interval-timer-popover-retime-editor-editing");
		intervalTimer.dispose();
	});

	it("does not open a custom context menu", async () => {
		const el = createDiv();
		await createPopover(el);

		fireEvent.contextMenu(el);

		expect(Menu.instances).toHaveLength(0);
	});

	it("keeps popover actions from triggering the status bar click", async () => {
		const user = userEvent.setup();
		const el = createDiv();
		const statusBarClick = vi.fn();
		el.addEventListener("click", statusBarClick);
		await createPopover(el);

		await user.click(within(el).getByRole("button", { name: "00" }));

		expect(statusBarClick).not.toHaveBeenCalled();
	});

	it("pins the popover after it is clicked", async () => {
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;

		await user.click(popover);

		expect(popover).toHaveClass("interval-timer-popover-pinned");
	});

	it("keeps a pinned popover open after the pointer leaves", async () => {
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;
		await user.click(popover);

		fireEvent.mouseLeave(el);

		expect(popover).toHaveClass("interval-timer-popover-pinned");
	});

	it("dismisses a pinned popover from its close button", async () => {
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;
		await user.click(popover);

		await user.click(within(el).getByRole("button", { name: "×" }));

		expect(popover).not.toHaveClass("interval-timer-popover-pinned");
		expect(popover).toHaveClass("interval-timer-popover-dismissed");
	});

	const createIntervalTimer = (): IntervalTimer =>
		new IntervalTimer(
			() => {},
			settings,
			() => {},
		);
});

const getRetimeInput = (container: HTMLElement): HTMLInputElement =>
	container.querySelector(
		".interval-timer-popover-inline-retime-input",
	) as HTMLInputElement;

const getRetimeForm = (container: HTMLElement): HTMLFormElement =>
	container.querySelector(
		".interval-timer-popover-inline-retime-form",
	) as HTMLFormElement;

const getRotation = (marker: SVGCircleElement): number =>
	Number(marker.getAttribute("transform")?.match(/rotate\(([-\d.]+)/)?.[1]);
