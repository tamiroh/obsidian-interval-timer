import { type TargetedKeyboardEvent, type TargetedPointerEvent } from "preact";
import { useState } from "preact/hooks";
import { isElement, windowFor } from "./dom";

export type Position = {
	left: number;
	top: number;
};

type Drag = {
	pointerId: number;
	offsetX: number;
	offsetY: number;
	originX: number;
	originY: number;
};

type UsePopoverFloatingOptions = {
	isFloating: boolean;
	draggable: boolean;
	onEnterFloating: () => void;
};

export type PopoverFloating = {
	position: Position | null;
	hasMovedFromOrigin: boolean;
	isDragging: boolean;
	enterFloating: (popover: HTMLDivElement) => void;
	returnToOrigin: () => void;
	reset: () => void;
	handlers: {
		onPointerDown: (event: TargetedPointerEvent<HTMLDivElement>) => void;
		onPointerMove: (event: TargetedPointerEvent<HTMLDivElement>) => void;
		onPointerUp: () => void;
		onPointerCancel: () => void;
		onLostPointerCapture: () => void;
		onKeyDown: (event: TargetedKeyboardEvent<HTMLDivElement>) => void;
	};
};

export const usePopoverFloating = ({
	isFloating,
	draggable,
	onEnterFloating,
}: UsePopoverFloatingOptions): PopoverFloating => {
	const [drag, setDrag] = useState<Drag | null>(null);
	const [position, setPosition] = useState<Position | null>(null);
	const [origin, setOrigin] = useState<Position | null>(null);

	const enterFloating = (popover: HTMLDivElement) => {
		if (isFloating) return;

		const bounds = popover.getBoundingClientRect();
		setPosition({ left: bounds.left, top: bounds.top });
		setOrigin({ left: bounds.left, top: bounds.top });
		onEnterFloating();
	};

	const returnToOrigin = () => {
		if (origin) setPosition(origin);
	};

	const reset = () => {
		setPosition(null);
		setOrigin(null);
	};

	const handlePointerDown = (event: TargetedPointerEvent<HTMLDivElement>) => {
		if (!isFloating || !draggable) return;
		if (isNonDraggableTarget(event.target)) return;

		const popover = event.currentTarget;
		const bounds = popover.getBoundingClientRect();
		const computedStyle = windowFor(popover).getComputedStyle(popover);
		const computedLeft = parseFloat(computedStyle.left);
		const computedTop = parseFloat(computedStyle.top);
		const cssPosition = {
			left: Number.isFinite(computedLeft) ? computedLeft : bounds.left,
			top: Number.isFinite(computedTop) ? computedTop : bounds.top,
		};
		if (!origin) setOrigin(cssPosition);
		setDrag({
			pointerId: event.pointerId,
			offsetX: event.clientX - bounds.left,
			offsetY: event.clientY - bounds.top,
			originX: bounds.left - cssPosition.left,
			originY: bounds.top - cssPosition.top,
		});
		popover.setPointerCapture(event.pointerId);
	};

	const handlePointerMove = (event: TargetedPointerEvent<HTMLDivElement>) => {
		if (drag?.pointerId !== event.pointerId) return;

		const bounds = event.currentTarget.getBoundingClientRect();
		const currentWindow = windowFor(event.currentTarget);
		const left = clamp(
			event.clientX - drag.offsetX,
			currentWindow.innerWidth - bounds.width,
		);
		const top = clamp(
			event.clientY - drag.offsetY,
			currentWindow.innerHeight - bounds.height,
		);
		setPosition({ left: left - drag.originX, top: top - drag.originY });
	};

	const handlePointerEnd = () => {
		setDrag(null);
	};

	const handleKeyDown = (event: TargetedKeyboardEvent<HTMLDivElement>) => {
		if (event.target !== event.currentTarget) return;
		if (isFloating || !isFloatingKey(event.key)) return;

		event.preventDefault();
		enterFloating(event.currentTarget);
	};

	return {
		position,
		hasMovedFromOrigin:
			isFloating &&
			origin !== null &&
			position !== null &&
			(position.left !== origin.left || position.top !== origin.top),
		isDragging: drag !== null,
		enterFloating,
		returnToOrigin,
		reset,
		handlers: {
			onPointerDown: handlePointerDown,
			onPointerMove: handlePointerMove,
			onPointerUp: handlePointerEnd,
			onPointerCancel: handlePointerEnd,
			onLostPointerCapture: handlePointerEnd,
			onKeyDown: handleKeyDown,
		},
	};
};

const clamp = (position: number, maximum: number): number =>
	Math.min(Math.max(0, position), Math.max(0, maximum));

const isNonDraggableTarget = (target: EventTarget | null): boolean =>
	isElement(target) && target.closest("button, input, form") !== null;

const isFloatingKey = (key: string): boolean => key === "Enter" || key === " ";
