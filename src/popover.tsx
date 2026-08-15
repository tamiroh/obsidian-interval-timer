import {
	MouseEventHandler,
	render,
	TargetedEvent,
	TargetedKeyboardEvent,
	TargetedMouseEvent,
	TargetedPointerEvent,
} from "preact";
import { useRef, useState } from "preact/hooks";
import { match } from "ts-pattern";
import { TimerType } from "./countdown-timer";
import {
	defaultLongBreakAfter,
	IntervalTimer,
	IntervalTimerState,
	TouchAction,
} from "./interval-timer";
import { ObservableStore, useObservableStore } from "./observable-store";
import { minutesUpperBound, Time, toSeconds } from "./time";

//
// Constants and types
//

const setRingRadius = 35;
const setRingStrokeWidth = 3.5;

type PopoverSnapshot = {
	time: Time;
	intervalTimerState: IntervalTimerState;
	timerState: TimerType;
	intervalsSet: number;
	longBreakAfter: number;
	remainingPercent: number;
	currentTaskName: string | null;
	isFloating: boolean;
	isDismissed: boolean;
	touchAction: TouchAction;
	intervalTimer: IntervalTimer | null;
};

type Drag = {
	pointerId: number;
	offsetX: number;
	offsetY: number;
	originX: number;
	originY: number;
};

type Position = {
	left: number;
	top: number;
};

type ExpandedTask = {
	name: string;
	hoverBounds: Pick<DOMRect, "bottom" | "left" | "right" | "top">;
};

type ClosingAnimationState =
	| { current: "idle" }
	| {
			current: "animating";
			offsetX: number;
			offsetY: number;
			restoreFocus: boolean;
	  }
	| { current: "completed" };

//
// Mounting
//

export class Popover {
	private readonly rootElement: HTMLSpanElement;

	private readonly store: ObservableStore<PopoverSnapshot>;

	private intervalTotalSeconds = 0;

	constructor(
		private readonly container: HTMLElement,
		options: {
			getReturnTarget: () => Position;
			onFloatingChange: (floating: boolean) => void;
			onRestoreFocus: () => void;
			notify: (message: string) => void;
			renderIcon: (element: HTMLElement, iconId: string) => void;
			floatOnMount?: boolean;
			dismissible?: boolean;
		},
	) {
		this.store = new ObservableStore<PopoverSnapshot>({
			time: { minutes: 0, seconds: 0 },
			intervalTimerState: "focus",
			timerState: "initialized",
			intervalsSet: 0,
			longBreakAfter: defaultLongBreakAfter,
			remainingPercent: 0,
			currentTaskName: null,
			isFloating: options.floatOnMount ?? false,
			isDismissed: false,
			touchAction: "start",
			intervalTimer: null,
		});
		this.rootElement = container.createSpan({
			cls: "interval-timer-popover-root",
		});
		container.addEventListener("mouseleave", this.handleDismissalReset);
		container.addEventListener("focusin", this.handleDismissalReset);
		render(
			<PopoverView
				store={this.store}
				getReturnTarget={options.getReturnTarget}
				onFloatingChange={options.onFloatingChange}
				onRestoreFocus={options.onRestoreFocus}
				notify={options.notify}
				renderIcon={options.renderIcon}
				dismissible={options.dismissible ?? true}
			/>,
			this.rootElement,
		);
	}

	public dispose(): void {
		this.container.removeEventListener(
			"mouseleave",
			this.handleDismissalReset,
		);
		this.container.removeEventListener(
			"focusin",
			this.handleDismissalReset,
		);
		render(null, this.rootElement);
		this.rootElement.remove();
	}

	public update(
		time: Time,
		intervalTimerState: IntervalTimerState,
		timerState: TimerType,
		intervalsSet = 0,
		longBreakAfter = defaultLongBreakAfter,
	): void {
		const remainingSeconds = toSeconds(time);
		if (timerState === "initialized" || this.intervalTotalSeconds === 0) {
			this.intervalTotalSeconds = remainingSeconds;
		}

		this.store.update({
			time,
			intervalTimerState,
			timerState,
			intervalsSet,
			longBreakAfter,
			remainingPercent: this.getRemainingPercent(remainingSeconds),
			touchAction:
				this.store.state.intervalTimer?.predictTouch() ?? "start",
		});
	}

	public updateTrackedTask(currentTaskName: string | null): void {
		this.store.update({ currentTaskName });
	}

	public updateLongBreakAfter(longBreakAfter: number): void {
		this.store.update({ longBreakAfter });
	}

	public enableActions(intervalTimer: IntervalTimer): void {
		this.store.update({
			intervalTimer,
			touchAction: intervalTimer.predictTouch(),
		});
	}

	private getRemainingPercent(remainingSeconds: number): number {
		if (this.intervalTotalSeconds === 0) return 0;

		return Math.min(
			100,
			Math.max(0, (remainingSeconds / this.intervalTotalSeconds) * 100),
		);
	}

	private readonly handleDismissalReset = (
		event: MouseEvent | FocusEvent,
	): void => {
		if (
			event.type === "focusin" &&
			event.relatedTarget instanceof Element &&
			event.relatedTarget.closest(".interval-timer-popover-close")
		)
			return;

		if (this.store.state.isDismissed) {
			this.store.update({ isDismissed: false });
		}
	};
}

//
// Main component
//

const PopoverView = ({
	store,
	getReturnTarget,
	onFloatingChange,
	onRestoreFocus,
	notify,
	renderIcon,
	dismissible = true,
}: {
	store: ObservableStore<PopoverSnapshot>;
	getReturnTarget: () => Position;
	onFloatingChange: (floating: boolean) => void;
	onRestoreFocus: () => void;
	notify: (message: string) => void;
	renderIcon: (element: HTMLElement, iconId: string) => void;
	dismissible?: boolean;
}) => {
	const {
		intervalTimer,
		time,
		intervalTimerState,
		timerState,
		intervalsSet,
		longBreakAfter,
		remainingPercent,
		currentTaskName,
		isFloating,
		isDismissed,
		touchAction,
	} = useObservableStore(store);
	const [isEditingTime, setIsEditingTime] = useState(false);
	const [expandedTask, setExpandedTask] = useState<ExpandedTask | null>(null);
	const [drag, setDrag] = useState<Drag | null>(null);
	const [popoverPosition, setPopoverPosition] = useState<Position | null>(
		null,
	);
	const [returnTarget, setReturnTarget] = useState<Position | null>(null);
	const [floatingOrigin, setFloatingOrigin] = useState<Position | null>(null);
	const [closingAnimationState, setClosingAnimationState] =
		useState<ClosingAnimationState>({ current: "idle" });
	const minutesButtonRef = useRef<HTMLButtonElement>(null);
	const retimeInputRef = useRef<HTMLInputElement>(null);
	const suppressBlurApplyRef = useRef(false);
	const touchActionPresentation = getTouchActionPresentation(touchAction);
	const taskName =
		intervalTimerState === "focus"
			? (currentTaskName ?? "No task selected")
			: "Break time";
	const isTaskNameExpanded = expandedTask?.name === taskName;

	const handleMinutesClick = () => {
		suppressBlurApplyRef.current = false;
		setIsEditingTime(true);
		window.requestAnimationFrame(() => {
			if (!retimeInputRef.current) return;

			retimeInputRef.current.value = String(time.minutes);
			retimeInputRef.current.focus({ preventScroll: true });
			retimeInputRef.current.select();
		});
	};

	const stopEditingTime = (restoreFocus: boolean) => {
		setIsEditingTime(false);
		if (restoreFocus) {
			suppressBlurApplyRef.current = true;
			minutesButtonRef.current?.focus();
		}
	};

	const applyRetime = (restoreFocus = true) => {
		if (!intervalTimer || !retimeInputRef.current) return;

		const result = intervalTimer.retime(
			Number(retimeInputRef.current.value),
		);
		if (!result.ok) {
			if (!restoreFocus) {
				retimeInputRef.current.value = String(time.minutes);
				stopEditingTime(false);
				return;
			}

			notify(
				match(result.reason)
					.with(
						"timer_running",
						() =>
							"Pause the timer before changing the remaining time.",
					)
					.with(
						"out_of_range_minutes",
						() => `Enter fewer than ${minutesUpperBound} minutes.`,
					)
					.with(
						"invalid_minutes",
						() => "Enter a positive whole number of minutes.",
					)
					.exhaustive(),
			);
			retimeInputRef.current.select();
			return;
		}

		stopEditingTime(restoreFocus);
	};

	const handleRetimeSubmit = (
		event: TargetedEvent<HTMLFormElement, SubmitEvent>,
	) => {
		event.preventDefault();
		applyRetime();
	};

	const handleRetimeInputKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Escape") {
			event.preventDefault();
			stopEditingTime(true);
		}
	};

	const enterFloatingMode = (popover: HTMLDivElement) => {
		if (isFloating) return;

		const bounds = popover.getBoundingClientRect();
		setClosingAnimationState({ current: "idle" });
		setPopoverPosition({ left: bounds.left, top: bounds.top });
		setFloatingOrigin({ left: bounds.left, top: bounds.top });
		setReturnTarget(getReturnTarget());
		store.update({ isFloating: true });
		onFloatingChange(true);
	};

	const dismiss = (restoreFocus: boolean) => {
		setClosingAnimationState({ current: "completed" });
		setReturnTarget(null);
		setPopoverPosition(null);
		setFloatingOrigin(null);
		store.update({ isFloating: false, isDismissed: true });
		onFloatingChange(false);
		if (restoreFocus) {
			window.requestAnimationFrame(() => onRestoreFocus());
		}
	};

	const handleCloseClick = (event: TargetedMouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		setIsEditingTime(false);

		const restoreFocus = event.detail === 0;
		if (!restoreFocus) event.currentTarget.blur();

		const bounds =
			event.currentTarget.parentElement?.getBoundingClientRect();
		if (
			!returnTarget ||
			!bounds ||
			window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
		) {
			dismiss(restoreFocus);
			return;
		}

		setClosingAnimationState({
			current: "animating",
			offsetX: returnTarget.left - (bounds.left + bounds.width / 2),
			offsetY: returnTarget.top - (bounds.top + bounds.height / 2),
			restoreFocus,
		});
	};

	const handleReturnToOrigin = (
		event: TargetedMouseEvent<HTMLButtonElement>,
	) => {
		event.stopPropagation();
		if (floatingOrigin) setPopoverPosition(floatingOrigin);
		if (event.detail > 0) event.currentTarget.blur();
	};

	const handlePopoverPointerDown = (
		event: TargetedPointerEvent<HTMLDivElement>,
	) => {
		if (!isFloating) return;
		if (isNonDraggableTarget(event.target)) return;

		const popover = event.currentTarget;
		const bounds = popover.getBoundingClientRect();
		const computedStyle = getComputedStyle(popover);
		const computedLeft = parseFloat(computedStyle.left);
		const computedTop = parseFloat(computedStyle.top);
		const cssPosition = {
			left: Number.isFinite(computedLeft) ? computedLeft : bounds.left,
			top: Number.isFinite(computedTop) ? computedTop : bounds.top,
		};
		if (!floatingOrigin) {
			setFloatingOrigin(cssPosition);
		}
		setDrag({
			pointerId: event.pointerId,
			offsetX: event.clientX - bounds.left,
			offsetY: event.clientY - bounds.top,
			originX: bounds.left - cssPosition.left,
			originY: bounds.top - cssPosition.top,
		});
		popover.setPointerCapture?.(event.pointerId);
	};

	const handlePopoverPointerMove = (
		event: TargetedPointerEvent<HTMLDivElement>,
	) => {
		if (drag?.pointerId !== event.pointerId) return;

		const bounds = event.currentTarget.getBoundingClientRect();
		const left = clamp(
			event.clientX - drag.offsetX,
			window.innerWidth - bounds.width,
		);
		const top = clamp(
			event.clientY - drag.offsetY,
			window.innerHeight - bounds.height,
		);
		setPopoverPosition({
			left: left - drag.originX,
			top: top - drag.originY,
		});
	};

	const handlePopoverKeyDown = (
		event: TargetedKeyboardEvent<HTMLDivElement>,
	) => {
		if (event.target !== event.currentTarget) return;
		if (isFloating || !isFloatingKey(event.key)) return;

		event.preventDefault();
		enterFloatingMode(event.currentTarget);
	};

	const handlePopoverPointerEnd = () => {
		setDrag(null);
	};

	const hasMovedFromOrigin =
		isFloating &&
		floatingOrigin !== null &&
		popoverPosition !== null &&
		(popoverPosition.left !== floatingOrigin.left ||
			popoverPosition.top !== floatingOrigin.top);

	const popoverClassName = [
		"interval-timer-popover",
		intervalTimerState === "focus"
			? "interval-timer-popover-focus"
			: "interval-timer-popover-break",
		isFloating && "interval-timer-popover-floating",
		hasMovedFromOrigin && "interval-timer-popover-moved",
		closingAnimationState.current === "animating" &&
			"interval-timer-popover-returning",
		drag && "interval-timer-popover-dragging",
		isDismissed && "interval-timer-popover-dismissed",
		!dismissible && "interval-timer-popover-no-close",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			className={popoverClassName}
			style={
				closingAnimationState.current === "animating"
					? {
							...popoverPosition,
							transform: `translate(${closingAnimationState.offsetX}px, ${closingAnimationState.offsetY}px) scale(0.15)`,
						}
					: (popoverPosition ?? undefined)
			}
			role="group"
			tabIndex={0}
			onPointerDown={handlePopoverPointerDown}
			onPointerMove={handlePopoverPointerMove}
			onPointerUp={handlePopoverPointerEnd}
			onPointerCancel={handlePopoverPointerEnd}
			onLostPointerCapture={handlePopoverPointerEnd}
			onKeyDown={handlePopoverKeyDown}
			onTransitionEnd={(event) => {
				if (
					event.target === event.currentTarget &&
					event.propertyName === "transform" &&
					closingAnimationState.current === "animating"
				) {
					dismiss(closingAnimationState.restoreFocus);
				}
			}}
			onContextMenu={(event) => blurFocusWithin(event.currentTarget)}
			onClick={(event) => {
				event.stopPropagation();
				enterFloatingMode(event.currentTarget);
			}}
		>
			{dismissible && (
				<button
					type="button"
					className="interval-timer-popover-close"
					aria-label="Close"
					aria-hidden={!isFloating}
					tabIndex={isFloating ? 0 : -1}
					onClick={handleCloseClick}
				>
					<Icon
						name="x"
						className="interval-timer-popover-close-icon"
						renderIcon={renderIcon}
					/>
				</button>
			)}
			<button
				type="button"
				className="interval-timer-popover-return"
				aria-label="Return to original position"
				aria-hidden={!hasMovedFromOrigin}
				tabIndex={hasMovedFromOrigin ? 0 : -1}
				onClick={handleReturnToOrigin}
			>
				<Icon
					name="undo-2"
					className="interval-timer-popover-return-icon"
					renderIcon={renderIcon}
				/>
			</button>
			<div className="interval-timer-popover-body">
				<div className="interval-timer-popover-clock">
					<svg
						className="interval-timer-popover-clock-progress"
						viewBox="0 0 100 100"
						aria-hidden="true"
					>
						<circle
							className="interval-timer-popover-clock-track"
							cx="50"
							cy="50"
							r="44"
						/>
						<SetRing
							intervalTimerState={intervalTimerState}
							intervalsSet={intervalsSet}
							longBreakAfter={longBreakAfter}
						/>
						<circle
							className="interval-timer-popover-clock-value"
							cx="50"
							cy="50"
							r="44"
							pathLength="100"
							style={{
								strokeDashoffset: String(
									remainingPercent - 100,
								),
							}}
						/>
					</svg>
					<div className="interval-timer-popover-clock-readout">
						<div className="interval-timer-popover-clock-time">
							<div
								className={`interval-timer-popover-retime-editor${
									isEditingTime
										? " interval-timer-popover-retime-editor-editing"
										: ""
								}`}
							>
								<button
									ref={minutesButtonRef}
									type="button"
									className="interval-timer-popover-clock-minutes"
									disabled={
										!intervalTimer ||
										timerState === "running"
									}
									onClick={handleMinutesClick}
								>
									{String(time.minutes).padStart(2, "0")}
								</button>
								<form
									className="interval-timer-popover-inline-retime-form"
									onSubmit={handleRetimeSubmit}
								>
									<input
										ref={retimeInputRef}
										type="text"
										inputMode="numeric"
										pattern="[0-9]*"
										className="interval-timer-popover-inline-retime-input"
										autoComplete="off"
										spellcheck={false}
										defaultValue={time.minutes}
										onKeyDown={handleRetimeInputKeyDown}
										onClick={(event) =>
											event.currentTarget.select()
										}
										onBlur={() => {
											if (suppressBlurApplyRef.current) {
												suppressBlurApplyRef.current = false;
												return;
											}
											if (isEditingTime)
												applyRetime(false);
										}}
									/>
								</form>
							</div>
							<span
								className={`interval-timer-popover-clock-separator${
									timerState === "running"
										? " interval-timer-popover-clock-separator-running"
										: ""
								}`}
							>
								:
							</span>
							<span className="interval-timer-popover-clock-seconds">
								{String(time.seconds).padStart(2, "0")}
							</span>
						</div>
					</div>
				</div>
				<div className="interval-timer-popover-task">
					<div
						className={`interval-timer-popover-task-name${
							intervalTimerState === "focus" &&
							currentTaskName === null
								? " interval-timer-popover-task-name-empty"
								: intervalTimerState !== "focus"
									? " interval-timer-popover-task-name-break"
									: ""
						}${
							isTaskNameExpanded
								? " interval-timer-popover-task-name-expanded"
								: ""
						}`}
						onMouseEnter={(event) => {
							if (isElementTruncated(event.currentTarget)) {
								setExpandedTask({
									name: taskName,
									hoverBounds:
										event.currentTarget.getBoundingClientRect(),
								});
							}
						}}
						onMouseMove={(event) => {
							if (
								expandedTask &&
								!containsPoint(
									expandedTask.hoverBounds,
									event.clientX,
									event.clientY,
								)
							) {
								setExpandedTask(null);
							}
						}}
						onMouseLeave={() => setExpandedTask(null)}
					>
						{taskName}
					</div>
					{!isTaskNameExpanded && (
						<div className="interval-timer-popover-task-actions">
							<Action
								className="interval-timer-popover-touch-action"
								icon={touchActionPresentation.icon}
								disabled={!intervalTimer}
								renderIcon={renderIcon}
								onClick={() => {
									if (!intervalTimer) return;

									intervalTimer.touch();
									store.update({
										touchAction:
											intervalTimer.predictTouch(),
									});
								}}
							>
								{touchActionPresentation.label}
							</Action>
							<Action
								className="interval-timer-popover-reset-set"
								icon="rotate-ccw"
								renderIcon={renderIcon}
								onClick={() =>
									intervalTimer?.resetIntervalsSet()
								}
							>
								Reset set
							</Action>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

//
// Utils
//

const clamp = (position: number, maximum: number): number =>
	Math.min(Math.max(0, position), Math.max(0, maximum));

const isElementTruncated = (element: HTMLElement): boolean =>
	element.scrollHeight > element.clientHeight ||
	element.scrollWidth > element.clientWidth;

const containsPoint = (
	bounds: Pick<DOMRect, "bottom" | "left" | "right" | "top">,
	x: number,
	y: number,
): boolean =>
	x >= bounds.left &&
	x <= bounds.right &&
	y >= bounds.top &&
	y <= bounds.bottom;

const isNonDraggableTarget = (target: EventTarget | null): boolean =>
	target instanceof Element && target.closest("button, input, form") !== null;

const isFloatingKey = (key: string): boolean => key === "Enter" || key === " ";

const blurFocusWithin = (container: HTMLElement): void => {
	if (
		document.activeElement instanceof HTMLElement &&
		container.contains(document.activeElement)
	) {
		document.activeElement.blur();
	}
};

const getTouchActionPresentation = (
	action: TouchAction,
): { label: string; icon: string } =>
	match(action)
		.with("start", () => ({ label: "Start", icon: "play" }))
		.with("resume", () => ({ label: "Resume", icon: "play" }))
		.with("reset", () => ({ label: "Reset", icon: "rotate-ccw" }))
		.with("skip", () => ({ label: "Skip", icon: "skip-forward" }))
		.exhaustive();

//
// Components
//

type SetRingProps = Pick<
	PopoverSnapshot,
	"intervalTimerState" | "intervalsSet" | "longBreakAfter"
>;

const SetRing = ({
	intervalTimerState,
	intervalsSet,
	longBreakAfter,
}: SetRingProps) => {
	const markerCount = Math.min(longBreakAfter, 8);
	const filledMarkers =
		intervalTimerState === "longBreak"
			? markerCount
			: Math.round((intervalsSet / longBreakAfter) * markerCount);
	const markerSpan = 100 / markerCount;
	const markerGap = Math.min(3, markerSpan * 0.25);

	return (
		<g className="interval-timer-popover-set-ring">
			{Array.from({ length: markerCount }, (_, index) => (
				<circle
					key={index}
					className={`interval-timer-popover-set-ring-segment${
						index < filledMarkers
							? " interval-timer-popover-set-ring-segment-filled"
							: ""
					}`}
					cx="50"
					cy="50"
					r={setRingRadius}
					pathLength="100"
					style={{
						strokeWidth: setRingStrokeWidth,
						strokeDasharray: `${markerSpan - markerGap} ${
							100 - markerSpan + markerGap
						}`,
					}}
					transform={`rotate(${
						-90 + markerGap * 1.8 + index * (360 / markerCount)
					} 50 50)`}
				/>
			))}
		</g>
	);
};

const Icon = ({
	name,
	className,
	renderIcon,
}: {
	name: string;
	className?: string;
	renderIcon: (element: HTMLElement, iconId: string) => void;
}) => (
	<span
		className={className}
		aria-hidden="true"
		ref={(el) => {
			if (el) renderIcon(el, name);
		}}
	/>
);

type ActionProps = {
	className: string;
	icon: string;
	disabled?: boolean;
	renderIcon: (element: HTMLElement, iconId: string) => void;
	onClick: MouseEventHandler<HTMLButtonElement>;
	children: string;
};

const Action = ({
	className,
	icon,
	disabled = false,
	renderIcon,
	onClick,
	children,
}: ActionProps) => (
	<button
		type="button"
		className={className}
		disabled={disabled}
		onClick={(event) => {
			event.stopPropagation();
			onClick(event);
			if (event.detail > 0) event.currentTarget.blur();
		}}
	>
		<Icon
			name={icon}
			className="interval-timer-popover-task-action-icon"
			renderIcon={renderIcon}
		/>
		<span>{children}</span>
	</button>
);
