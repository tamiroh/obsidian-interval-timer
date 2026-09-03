import {
	type MouseEventHandler,
	render,
	type TargetedEvent,
	type TargetedMouseEvent,
} from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { match } from "ts-pattern";
import { type TimerState } from "./countdown-timer";
import { isElement, isHtmlElement, windowFor } from "./dom";
import {
	defaultLongBreakAfter,
	type IntervalTimer,
	type IntervalTimerState,
	type RetimeResult,
	type TouchAction,
} from "./interval-timer";
import { ObservableStore, useObservableStore } from "./observable-store";
import { type Position, usePopoverFloating } from "./popover-floating";
import type { ResultFailureReason } from "./result";
import { minutesUpperBound, time, type Time, toSeconds } from "./time";

//
// Constants and types
//

const setRingRadius = 35;
const setRingStrokeWidth = 3.5;

type PopoverSnapshot = {
	time: Time;
	intervalTimerState: IntervalTimerState;
	timerState: TimerState;
	intervalsSet: number;
	longBreakAfter: number;
	remainingPercent: number;
	currentTaskName: string | null;
	isFloating: boolean;
	isDismissed: boolean;
	touchAction: TouchAction;
	intervalTimer: IntervalTimer | null;
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

const retimeValidationMessage = (
	reason: ResultFailureReason<RetimeResult>,
): string =>
	match(reason)
		.with(
			"timer_running",
			() => "Pause the timer before changing the remaining time.",
		)
		.with(
			"out_of_range_minutes",
			() => `Enter fewer than ${minutesUpperBound} minutes.`,
		)
		.with("non_positive_integer", () => "Enter a positive whole number.")
		.with("non_integer", () => "Enter a whole number.")
		.with("invalid_number", () => "Enter a number.")
		.exhaustive();

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
			draggable?: boolean;
		},
	) {
		this.store = new ObservableStore<PopoverSnapshot>({
			time: time(0, 0),
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
		this.rootElement.dataset.testid = "popover-root";
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
				draggable={options.draggable ?? true}
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
		currentTime: Time,
		intervalTimerState: IntervalTimerState,
		timerState: TimerState,
		intervalsSet = 0,
		longBreakAfter = defaultLongBreakAfter,
	): void {
		const remainingSeconds = toSeconds(currentTime);
		if (timerState === "initialized" || this.intervalTotalSeconds === 0) {
			this.intervalTotalSeconds = remainingSeconds;
		}

		this.store.update({
			time: currentTime,
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
			isElement(event.relatedTarget) &&
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
	draggable = true,
}: {
	store: ObservableStore<PopoverSnapshot>;
	getReturnTarget: () => Position;
	onFloatingChange: (floating: boolean) => void;
	onRestoreFocus: () => void;
	notify: (message: string) => void;
	renderIcon: (element: HTMLElement, iconId: string) => void;
	dismissible?: boolean;
	draggable?: boolean;
}) => {
	const {
		intervalTimer,
		time: currentTime,
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
	const [retimeValue, setRetimeValue] = useState(String(currentTime.minutes));
	const [shouldRestoreFocus, setShouldRestoreFocus] = useState(false);
	const [expandedTask, setExpandedTask] = useState<ExpandedTask | null>(null);
	const [closingAnimationState, setClosingAnimationState] =
		useState<ClosingAnimationState>({ current: "idle" });
	const floating = usePopoverFloating({
		isFloating,
		draggable,
		getReturnTarget,
		onEnterFloating: () => {
			setClosingAnimationState({ current: "idle" });
			store.update({ isFloating: true });
			onFloatingChange(true);
		},
	});
	const minutesButtonRef = useRef<HTMLButtonElement>(null);
	const retimeInputRef = useRef<HTMLInputElement>(null);
	const suppressBlurApplyRef = useRef(false);
	const touchActionPresentation = getTouchActionPresentation(touchAction);
	const taskName =
		intervalTimerState === "focus"
			? (currentTaskName ?? "No task selected")
			: "Break time";
	const isTaskNameExpanded = expandedTask?.name === taskName;

	useLayoutEffect(() => {
		if (isEditingTime) {
			retimeInputRef.current?.focus({ preventScroll: true });
			retimeInputRef.current?.select();
		}
	}, [isEditingTime]);

	useLayoutEffect(() => {
		if (shouldRestoreFocus) {
			setShouldRestoreFocus(false);
			onRestoreFocus();
		}
	}, [shouldRestoreFocus, onRestoreFocus]);

	const handleMinutesClick = () => {
		suppressBlurApplyRef.current = false;
		setRetimeValue(String(currentTime.minutes));
		setIsEditingTime(true);
	};

	const stopEditingTime = (restoreFocus: boolean) => {
		setIsEditingTime(false);
		if (restoreFocus) {
			suppressBlurApplyRef.current = true;
			minutesButtonRef.current?.focus();
		}
	};

	const applyRetime = (restoreFocus = true) => {
		if (!intervalTimer) return;

		match(intervalTimer.retime(Number(retimeValue)))
			.with({ ok: false }, ({ reason }) => {
				if (!restoreFocus) {
					setRetimeValue(String(currentTime.minutes));
					stopEditingTime(false);
					return;
				}

				notify(retimeValidationMessage(reason));
				retimeInputRef.current?.select();
			})
			.with({ ok: true }, () => {
				stopEditingTime(restoreFocus);
			})
			.exhaustive();
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

	const dismiss = (restoreFocus: boolean) => {
		setClosingAnimationState({ current: "completed" });
		floating.reset();
		store.update({ isFloating: false, isDismissed: true });
		onFloatingChange(false);
		if (restoreFocus) {
			setShouldRestoreFocus(true);
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
			!floating.returnTarget ||
			!bounds ||
			windowFor(event.currentTarget).matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches
		) {
			dismiss(restoreFocus);
			return;
		}

		setClosingAnimationState({
			current: "animating",
			offsetX:
				floating.returnTarget.left - (bounds.left + bounds.width / 2),
			offsetY:
				floating.returnTarget.top - (bounds.top + bounds.height / 2),
			restoreFocus,
		});
	};

	const handleReturnToOrigin = (
		event: TargetedMouseEvent<HTMLButtonElement>,
	) => {
		event.stopPropagation();
		floating.returnToOrigin();
		if (event.detail > 0) event.currentTarget.blur();
	};

	const popoverClassName = [
		"interval-timer-popover",
		intervalTimerState === "focus"
			? "interval-timer-popover-focus"
			: "interval-timer-popover-break",
		isFloating && "interval-timer-popover-floating",
		floating.hasMovedFromOrigin && "interval-timer-popover-moved",
		closingAnimationState.current === "animating" &&
			"interval-timer-popover-returning",
		floating.isDragging && "interval-timer-popover-dragging",
		isDismissed && "interval-timer-popover-dismissed",
		!dismissible && "interval-timer-popover-no-close",
		!draggable && "interval-timer-popover-no-drag",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			className={popoverClassName}
			style={
				closingAnimationState.current === "animating"
					? {
							...floating.position,
							transform: `translate(${closingAnimationState.offsetX}px, ${closingAnimationState.offsetY}px) scale(0.15)`,
						}
					: (floating.position ?? undefined)
			}
			role="group"
			tabIndex={0}
			{...floating.handlers}
			onTransitionEnd={(event) => {
				if (
					event.target === event.currentTarget &&
					event.propertyName === "transform" &&
					closingAnimationState.current === "animating"
				) {
					dismiss(closingAnimationState.restoreFocus);
				}
			}}
			onContextMenu={(event) => {
				blurFocusWithin(event.currentTarget);
			}}
			onClick={(event) => {
				event.stopPropagation();
				floating.enterFloating(event.currentTarget);
			}}
		>
			{dismissible && (
				<button
					type="button"
					className="interval-timer-popover-close"
					data-testid="popover-close"
					aria-label="Close"
					aria-hidden={!isFloating}
					tabIndex={isFloating ? 0 : -1}
					disabled={!isFloating}
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
				data-testid="popover-return"
				aria-label="Return to original position"
				aria-hidden={!floating.hasMovedFromOrigin}
				tabIndex={floating.hasMovedFromOrigin ? 0 : -1}
				disabled={!floating.hasMovedFromOrigin}
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
							data-testid="popover-clock-value"
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
						<div
							className="interval-timer-popover-clock-time"
							data-testid="popover-clock-time"
						>
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
										timerState === "running" ||
										isEditingTime
									}
									onClick={handleMinutesClick}
								>
									{String(currentTime.minutes).padStart(
										2,
										"0",
									)}
								</button>
								<form
									className="interval-timer-popover-inline-retime-form"
									aria-label="Retime"
									onSubmit={handleRetimeSubmit}
								>
									<input
										ref={retimeInputRef}
										type="text"
										inputMode="numeric"
										pattern="[0-9]*"
										className="interval-timer-popover-inline-retime-input"
										aria-label="Retime minutes"
										autoComplete="off"
										spellcheck={false}
										value={retimeValue}
										onInput={(event) => {
											setRetimeValue(
												event.currentTarget.value,
											);
										}}
										onKeyDown={handleRetimeInputKeyDown}
										onClick={(event) => {
											event.currentTarget.select();
										}}
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
								{String(currentTime.seconds).padStart(2, "0")}
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
						onMouseLeave={() => {
							setExpandedTask(null);
						}}
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

const blurFocusWithin = (container: HTMLElement): void => {
	const activeElement = container.ownerDocument.activeElement;
	if (isHtmlElement(activeElement) && container.contains(activeElement)) {
		activeElement.blur();
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
		.with("next", () => ({ label: "Next", icon: "skip-forward" }))
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
					data-testid="popover-set-ring-segment"
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
