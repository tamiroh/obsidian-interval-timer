import { within } from "@testing-library/dom";
import { afterEach, describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { IntervalTimer, type IntervalTimerSetting } from "./interval-timer";
import { FloatingTimer } from "./obsidian-floating-timer";
import * as t from "./time";

const settings: IntervalTimerSetting = {
	focusIntervalDuration: 25,
	shortBreakDuration: 5,
	longBreakDuration: 15,
	longBreakAfter: 4,
	resetTime: { hours: 0, minutes: 0 },
};

const createFloatingTimer = (app: App): FloatingTimer =>
	new FloatingTimer(app, { notify: () => {}, renderIcon: () => {} });

describe("FloatingTimer", () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it("mounts a permanently floating popover onto the document body", async () => {
		// Act
		const floatingTimer = createFloatingTimer(createApp());

		// Assert
		await within(document.body).findByText("No task selected");
		expect(within(document.body).getByRole("group")).toHaveClass(
			"interval-timer-popover-floating",
		);
		floatingTimer.dispose();
	});

	it("does not offer a close button, since there is no status bar to return to", async () => {
		// Act
		const floatingTimer = createFloatingTimer(createApp());

		// Assert
		await within(document.body).findByText("No task selected");
		expect(
			within(document.body).queryByRole("button", { name: "Close" }),
		).not.toBeInTheDocument();
		floatingTimer.dispose();
	});

	it("updates the popover and enables timer actions", async () => {
		// Arrange
		const floatingTimer = createFloatingTimer(createApp());
		await within(document.body).findByText("No task selected");
		const intervalTimer = new IntervalTimer(settings);

		// Act
		floatingTimer.update(
			{ total: 4, set: 2 },
			t.time(7, 5),
			"focus",
			"running",
		);
		floatingTimer.enableClick(intervalTimer);

		// Assert
		await within(document.body).findByText("07");
		expect(
			within(document.body).getByTestId("popover-clock-time"),
		).toHaveTextContent("07:05");
		expect(
			within(document.body).getByRole("button", { name: "Start" }),
		).toBeEnabled();
		intervalTimer.dispose();
		floatingTimer.dispose();
	});

	it("removes its container from the document on dispose", async () => {
		// Arrange
		const floatingTimer = createFloatingTimer(createApp());
		await within(document.body).findByText("No task selected");

		// Act
		floatingTimer.dispose();

		// Assert
		expect(
			within(document.body).queryByTestId("floating-timer"),
		).not.toBeInTheDocument();
	});

	it("mounts inside the active leaf's view container", () => {
		// Arrange
		const leafContainer = createDiv();
		document.body.append(leafContainer);

		// Act
		const floatingTimer = createFloatingTimer(
			createAppWithLeaf(leafContainer),
		);

		// Assert
		expect(
			within(leafContainer).getByTestId("floating-timer"),
		).toBeInTheDocument();
		floatingTimer.dispose();
	});

	it("follows the active leaf when it changes", () => {
		// Arrange
		const firstLeaf = createDiv();
		const secondLeaf = createDiv();
		document.body.append(firstLeaf, secondLeaf);
		const app = createAppWithLeaf(firstLeaf);
		const floatingTimer = createFloatingTimer(app);

		// Act
		app.setActiveLeafContainer(secondLeaf);
		app.triggerActiveLeafChange();

		// Assert
		expect(
			within(secondLeaf).getByTestId("floating-timer"),
		).toBeInTheDocument();
		expect(
			within(firstLeaf).queryByTestId("floating-timer"),
		).not.toBeInTheDocument();
		floatingTimer.dispose();
	});
});

const createApp = (): App => createAppWithLeaf(null);

const createAppWithLeaf = (
	initialLeafContainer: HTMLElement | null,
): App & {
	setActiveLeafContainer: (containerEl: HTMLElement | null) => void;
	triggerActiveLeafChange: () => void;
} => {
	let leafContainer = initialLeafContainer;
	const handlers = new Set<() => void>();

	return {
		workspace: {
			getMostRecentLeaf: () =>
				leafContainer ? { view: { containerEl: leafContainer } } : null,
			on: (_name: string, callback: () => void) => {
				handlers.add(callback);
				return { callback };
			},
			offref: (ref: { callback: () => void }) => {
				handlers.delete(ref.callback);
			},
		},
		setActiveLeafContainer: (containerEl: HTMLElement | null) => {
			leafContainer = containerEl;
		},
		triggerActiveLeafChange: () => {
			handlers.forEach((callback) => {
				callback();
			});
		},
	} as unknown as App & {
		setActiveLeafContainer: (containerEl: HTMLElement | null) => void;
		triggerActiveLeafChange: () => void;
	};
};
