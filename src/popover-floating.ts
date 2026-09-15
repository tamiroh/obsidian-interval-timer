import {
	type CSSProperties,
	type TargetedKeyboardEvent,
	type TargetedPointerEvent,
} from "preact";
import { useState } from "preact/hooks";
import { isElement, windowFor } from "./dom";

type OriginFromWindowBottomRight = {
	right: number;
	bottom: number;
};

type OffsetFromOrigin = {
	x: number;
	y: number;
};

type Drag = {
	pointerId: number;
	grabX: number;
	grabY: number;
	originLeft: number;
	originTop: number;
};

type UsePopoverFloatingOptions = {
	isFloating: boolean;
	draggable: boolean;
	onEnterFloating: () => void;
};

export type PopoverFloating = {
	style: CSSProperties | undefined;
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
	const [origin, setOrigin] = useState<OriginFromWindowBottomRight | null>(
		null,
	);
	const [offset, setOffset] = useState<OffsetFromOrigin | null>(null);

	const enterFloating = (popover: HTMLDivElement) => {
		if (isFloating) return;

		const bounds = popover.getBoundingClientRect();
		const currentWindow = windowFor(popover);
		setOrigin({
			right: currentWindow.innerWidth - bounds.right,
			bottom: currentWindow.innerHeight - bounds.bottom,
		});
		onEnterFloating();
	};

	const returnToOrigin = () => {
		setOffset(null);
	};

	const reset = () => {
		setOrigin(null);
		setOffset(null);
	};

	const handlePointerDown = (event: TargetedPointerEvent<HTMLDivElement>) => {
		if (!isFloating || !draggable) return;
		if (isNonDraggableTarget(event.target)) return;

		const popover = event.currentTarget;
		const bounds = popover.getBoundingClientRect();
		// Read the rendered offset rather than the state so that grabbing the
		// popover mid-animation keeps its origin intact.
		const rendered = renderedOffsetFromOrigin(popover);
		setDrag({
			pointerId: event.pointerId,
			grabX: event.clientX - bounds.left,
			grabY: event.clientY - bounds.top,
			originLeft: bounds.left - rendered.x,
			originTop: bounds.top - rendered.y,
		});
		popover.setPointerCapture(event.pointerId);
	};

	const handlePointerMove = (event: TargetedPointerEvent<HTMLDivElement>) => {
		if (drag?.pointerId !== event.pointerId) return;

		const bounds = event.currentTarget.getBoundingClientRect();
		const currentWindow = windowFor(event.currentTarget);
		const left = clamp(
			event.clientX - drag.grabX,
			currentWindow.innerWidth - bounds.width,
		);
		const top = clamp(
			event.clientY - drag.grabY,
			currentWindow.innerHeight - bounds.height,
		);
		setOffset({ x: left - drag.originLeft, y: top - drag.originTop });
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
		style: floatingStyle(origin, offset),
		hasMovedFromOrigin:
			isFloating && offset !== null && (offset.x !== 0 || offset.y !== 0),
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

const floatingStyle = (
	origin: OriginFromWindowBottomRight | null,
	offset: OffsetFromOrigin | null,
): CSSProperties | undefined => {
	if (!origin && !offset) return undefined;

	return {
		...origin,
		...(offset && { translate: `${offset.x}px ${offset.y}px` }),
	};
};

const renderedOffsetFromOrigin = (
	popover: HTMLDivElement,
): OffsetFromOrigin => {
	const [x = 0, y = 0] = windowFor(popover)
		.getComputedStyle(popover)
		.translate.split(" ")
		.map((length) => parseFloat(length) || 0);
	return { x, y };
};

const clamp = (position: number, maximum: number): number =>
	Math.min(Math.max(0, position), Math.max(0, maximum));

const isNonDraggableTarget = (target: EventTarget | null): boolean =>
	isElement(target) && target.closest("button, input, form") !== null;

const isFloatingKey = (key: string): boolean => key === "Enter" || key === " ";
