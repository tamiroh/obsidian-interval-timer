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
		vi.restoreAllMocks();
	});

	it("renders the remaining time and empty task state", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");

		// Assert
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
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);
		popover.update({ minutes: 25, seconds: 0 }, "focus", "initialized");

		// Act
		popover.update({ minutes: 15, seconds: 0 }, "focus", "running");

		// Assert
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
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.update({ minutes: 5, seconds: 0 }, "shortBreak", "paused");

		// Assert
		await waitFor(() =>
			expect(el.querySelector(".interval-timer-popover")).toHaveClass(
				"interval-timer-popover-break",
			),
		);
		expect(el).not.toHaveClass("interval-timer-status-bar-break");
	});

	it("shows the break state instead of a task during a break", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);
		popover.updateTrackedTask("Write report");

		// Act
		popover.update({ minutes: 5, seconds: 0 }, "shortBreak", "initialized");

		// Assert
		await waitFor(() =>
			expect(
				within(el).queryByText("Write report"),
			).not.toBeInTheDocument(),
		);
		expect(
			within(el).queryByText("No task selected"),
		).not.toBeInTheDocument();
		expect(within(el).getByText("Break time")).toHaveClass(
			"interval-timer-popover-task-name-break",
		);
	});

	it("shows progress toward the next long break", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.update(
			{ minutes: 25, seconds: 0 },
			"focus",
			"initialized",
			2,
			4,
		);

		// Assert
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
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.update(
			{ minutes: 15, seconds: 0 },
			"longBreak",
			"initialized",
			0,
			4,
		);

		// Assert
		await waitFor(() =>
			expect(
				el.querySelectorAll(
					".interval-timer-popover-set-ring-segment-filled",
				),
			).toHaveLength(4),
		);
	});

	it("updates the tracked task", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.updateTrackedTask("Write report");

		// Assert
		expect(await within(el).findByText("Write report")).toBeInTheDocument();
	});

	it("resets the intervals set from the integrated action", async () => {
		// Arrange
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

		// Act
		await user.click(
			await within(el).findByRole("button", { name: "Reset set" }),
		);

		// Assert
		expect(resetSpy).toHaveBeenCalledOnce();
		intervalTimer.dispose();
	});

	it("runs the timer touch action from the integrated action", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		const touchSpy = vi.spyOn(intervalTimer, "touch");
		const start = within(el).getByRole("button", { name: "Start" });
		popover.enableActions(intervalTimer);
		await waitFor(() => expect(start).toBeEnabled());

		// Act
		await user.click(start);

		// Assert
		expect(touchSpy).toHaveBeenCalledOnce();
		expect(
			await within(el).findByRole("button", { name: "Reset" }),
		).toBeEnabled();
		intervalTimer.dispose();
	});

	it("shows reset while a focus interval is running", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		const touchSpy = vi.spyOn(intervalTimer, "touch");
		intervalTimer.start();
		popover.enableActions(intervalTimer);
		popover.update({ minutes: 24, seconds: 0 }, "focus", "running");

		// Act
		await user.click(
			await within(el).findByRole("button", { name: "Reset" }),
		);

		// Assert
		expect(touchSpy).toHaveBeenCalledOnce();
		intervalTimer.dispose();
	});

	it("shows skip while a break interval is running", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		intervalTimer.applySnapshot({
			state: "shortBreak",
			minutes: 4,
			seconds: 0,
			focusIntervals: { total: 0, set: 0 },
		});
		intervalTimer.start();
		popover.enableActions(intervalTimer);

		// Act
		popover.update({ minutes: 4, seconds: 0 }, "shortBreak", "running");

		// Assert
		expect(
			await within(el).findByRole("button", { name: "Skip" }),
		).toBeEnabled();
		intervalTimer.dispose();
	});

	it("shows resume while an interval is paused", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		intervalTimer.start();
		intervalTimer.pause();
		popover.enableActions(intervalTimer);

		// Act
		popover.update({ minutes: 12, seconds: 0 }, "focus", "paused");

		// Assert
		expect(
			await within(el).findByRole("button", { name: "Resume" }),
		).toBeEnabled();
		intervalTimer.dispose();
	});

	it("disables start until timer actions are connected", async () => {
		// Arrange
		const el = createDiv();
		await createPopover(el);

		// Act
		const start = within(el).getByRole("button", { name: "Start" });

		// Assert
		expect(start).toBeDisabled();
	});

	it("turns the remaining time into an inline field", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");
		popover.enableActions(intervalTimer);

		// Act
		await user.click(await within(el).findByRole("button", { name: "07" }));

		// Assert
		const input = getRetimeInput(el);
		await waitFor(() => expect(input).toHaveFocus());
		expect(input).toHaveValue("7");
		expect(input.selectionStart).toBe(0);
		expect(input.selectionEnd).toBe(input.value.length);
		expect(
			el.querySelector(".interval-timer-popover-retime-editor"),
		).toHaveClass("interval-timer-popover-retime-editor-editing");
		expect(within(el).getByText("05")).toBeInTheDocument();
		intervalTimer.dispose();
	});

	it("selects the entire minute value when the input is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.update({ minutes: 12, seconds: 5 }, "focus", "initialized");
		popover.enableActions(intervalTimer);
		await user.click(await within(el).findByRole("button", { name: "12" }));
		const input = getRetimeInput(el);
		await waitFor(() => expect(input).toHaveFocus());
		input.setSelectionRange(1, 1);

		// Act
		await user.click(input);

		// Assert
		expect(input.selectionStart).toBe(0);
		expect(input.selectionEnd).toBe(input.value.length);
		intervalTimer.dispose();
	});

	it("disables retime while the timer is running", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.enableActions(intervalTimer);
		// Act
		popover.update({ minutes: 7, seconds: 0 }, "focus", "running");

		// Assert
		const minutes = await within(el).findByRole("button", { name: "07" });
		expect(minutes).toBeDisabled();
		intervalTimer.dispose();
	});

	it("applies a time edited in place", async () => {
		// Arrange
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
		await waitFor(() => expect(getRetimeInput(el)).toHaveFocus());

		// Act
		await user.clear(getRetimeInput(el));
		await user.type(getRetimeInput(el), "12");
		fireEvent.submit(getRetimeForm(el));

		// Assert
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
		// Arrange
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
		await waitFor(() => expect(getRetimeInput(el)).toHaveFocus());

		// Act
		await user.clear(getRetimeInput(el));
		await user.type(getRetimeInput(el), "18");
		await user.tab();

		// Assert
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
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");
		popover.enableActions(intervalTimer);
		await user.click(await within(el).findByRole("button", { name: "07" }));
		await waitFor(() => expect(getRetimeInput(el)).toHaveFocus());

		// Act
		await user.clear(getRetimeInput(el));
		await user.type(getRetimeInput(el), "1.5");
		fireEvent.submit(getRetimeForm(el));

		// Assert
		expect(Notice.messages).toEqual([
			"Enter a positive whole number of minutes.",
		]);
		expect(
			el.querySelector(".interval-timer-popover-retime-editor"),
		).toHaveClass("interval-timer-popover-retime-editor-editing");
		intervalTimer.dispose();
	});

	it("does not open a custom context menu", async () => {
		// Arrange
		const el = createDiv();
		await createPopover(el);

		// Act
		fireEvent.contextMenu(el);

		// Assert
		expect(Menu.instances).toHaveLength(0);
	});

	it("keeps popover actions from triggering the status bar click", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const statusBarClick = vi.fn();
		el.addEventListener("click", statusBarClick);
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.enableActions(intervalTimer);
		await waitFor(() =>
			expect(
				within(el).getByRole("button", { name: "00" }),
			).toBeEnabled(),
		);

		// Act
		await user.click(within(el).getByRole("button", { name: "00" }));

		// Assert
		expect(statusBarClick).not.toHaveBeenCalled();
		intervalTimer.dispose();
	});

	it("pins the popover after it is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;

		// Act
		await user.click(popover);

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-pinned");
	});

	it("keeps a pinned popover open after the pointer leaves", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;
		await user.click(popover);

		// Act
		fireEvent.mouseLeave(el);

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-pinned");
	});

	it("dismisses a pinned popover from its close button", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;
		await user.click(popover);

		// Act
		await user.click(within(el).getByRole("button", { name: "×" }));

		// Assert
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
