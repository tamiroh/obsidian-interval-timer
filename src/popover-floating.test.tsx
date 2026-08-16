import { fireEvent, within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { useState } from "preact/hooks";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Position, usePopoverFloating } from "./popover-floating";
import { cleanup, render } from "./render-preact";

afterEach(() => {
	cleanup();
});

const Target = ({ getReturnTarget }: { getReturnTarget: () => Position }) => {
	const [isFloating, setIsFloating] = useState(false);
	const floating = usePopoverFloating({
		isFloating,
		getReturnTarget,
		onEnterFloating: () => setIsFloating(true),
	});

	return (
		<div
			data-testid="target"
			style={floating.position ?? undefined}
			onClick={(event) => floating.enterFloating(event.currentTarget)}
			{...floating.handlers}
		/>
	);
};

describe("usePopoverFloating", () => {
	it("moves the position while dragging after entering floating mode", async () => {
		// Arrange
		const user = userEvent.setup();
		const container = render(
			<Target getReturnTarget={() => ({ left: 0, top: 0 })} />,
		);
		const target = within(container).getByTestId("target");
		vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 200,
			width: 250,
			height: 150,
		} as DOMRect);
		await user.click(target);
		fireEvent.pointerDown(target, {
			pointerId: 1,
			clientX: 120,
			clientY: 230,
		});

		// Act
		fireEvent.pointerMove(target, {
			pointerId: 1,
			clientX: 320,
			clientY: 330,
		});

		// Assert
		expect(target).toHaveStyle({ left: "300px", top: "300px" });
	});

	it("does not move when floating mode is off", () => {
		// Arrange
		const container = render(
			<Target getReturnTarget={() => ({ left: 0, top: 0 })} />,
		);
		const target = within(container).getByTestId("target");
		fireEvent.pointerDown(target, {
			pointerId: 1,
			clientX: 120,
			clientY: 230,
		});

		// Act
		fireEvent.pointerMove(target, {
			pointerId: 1,
			clientX: 320,
			clientY: 330,
		});

		// Assert
		expect(target).not.toHaveAttribute("style");
	});
});
