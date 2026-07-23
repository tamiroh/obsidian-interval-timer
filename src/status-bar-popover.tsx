import {
	KeyboardEvent,
	MouseEventHandler,
	PointerEvent as ReactPointerEvent,
	SyntheticEvent,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { createRoot, Root } from "react-dom/client";
import { Notice, setIcon } from "obsidian";
import { match } from "ts-pattern";
import { TimerType } from "./countdown-timer";
import {
	IntervalTimer,
	IntervalTimerState,
	TouchAction,
} from "./interval-timer";
import { ObservableStore } from "./observable-store";
import { Time, toSeconds } from "./time";

//
// Constants and types
//

const setRingRadius = 35;
const setRingStrokeWidth = 3.5;
const pinnedContainerClass = "interval-timer-status-bar-popover-pinned";

type PopoverSnapshot = {
	time: Time;
	intervalTimerState: IntervalTimerState;
	timerState: TimerType;
	intervalsSet: number;
	longBreakAfter: number;
	remainingPercent: number;
	currentTaskName: string | null;
	isPinned: boolean;
	isDismissed: boolean;
	touchAction: TouchAction;
	intervalTimer: IntervalTimer | null;
};

type Drag = {
	pointerId: number;
	offsetX: number;
	offsetY: number;
};

type Position = {
	left: number;
	top: number;
};

//
// Status bar integration
//

export class StatusBarPopover {
	private readonly root: Root;

	private readonly rootElement: HTMLSpanElement;

	private readonly store = new ObservableStore<PopoverSnapshot>({
		time: { minutes: 0, seconds: 0 },
		intervalTimerState: "focus",
		timerState: "initialized",
		intervalsSet: 0,
		longBreakAfter: 4,
		remainingPercent: 0,
		currentTaskName: null,
		isPinned: false,
		isDismissed: false,
		touchAction: "start",
		intervalTimer: null,
	});

	private intervalTotalSeconds = 0;

	constructor(private readonly container: HTMLElement) {
		this.rootElement = container.createSpan({
			cls: "interval-timer-popover-root",
		});
		this.root = createRoot(this.rootElement);
		container.addEventListener("mouseleave", this.handleDismissalReset);
		container.addEventListener("focusin", this.handleDismissalReset);
		this.root.render(
			<Popover store={this.store} container={this.container} />,
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
		this.root.unmount();
		this.rootElement.remove();
	}

	public update(
		time: Time,
		intervalTimerState: IntervalTimerState,
		timerState: TimerType,
		intervalsSet = 0,
		longBreakAfter = 4,
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
				this.store.getSnapshot().intervalTimer?.predictTouch() ??
				"start",
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

		if (this.store.getSnapshot().isDismissed) {
			this.store.update({ isDismissed: false });
		}
	};
}

//
// Main component
//

const Popover = ({
	store,
	container,
}: {
	store: ObservableStore<PopoverSnapshot>;
	container: HTMLElement;
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
		isPinned,
		isDismissed,
		touchAction,
	} = useSyncExternalStore(store.subscribe, store.getSnapshot);
	const [isEditingTime, setIsEditingTime] = useState(false);
	const [drag, setDrag] = useState<Drag | null>(null);
	const [popoverPosition, setPopoverPosition] = useState<Position | null>(
		null,
	);
	const minutesButton = useRef<HTMLButtonElement>(null);
	const retimeInput = useRef<HTMLInputElement>(null);
	const suppressBlurApply = useRef(false);
	const touchActionPresentation = getTouchActionPresentation(touchAction);
	const taskName =
		intervalTimerState === "focus"
			? (currentTaskName ?? "No task selected")
			: "Break time";

	useLayoutEffect(() => {
		container.classList.toggle(pinnedContainerClass, isPinned);
		return () => container.classList.remove(pinnedContainerClass);
	}, [container, isPinned]);

	const handleMinutesClick = () => {
		suppressBlurApply.current = false;
		setIsEditingTime(true);
		window.requestAnimationFrame(() => {
			if (!retimeInput.current) return;

			retimeInput.current.value = String(time.minutes);
			retimeInput.current.focus({ preventScroll: true });
			retimeInput.current.select();
		});
	};

	const stopEditingTime = (restoreFocus: boolean) => {
		setIsEditingTime(false);
		if (restoreFocus) {
			suppressBlurApply.current = true;
			minutesButton.current?.focus();
		}
	};

	const applyRetime = (restoreFocus = true) => {
		if (!intervalTimer || !retimeInput.current) return;

		const result = intervalTimer.retime(Number(retimeInput.current.value));
		if (!result.ok) {
			new Notice(
				result.reason === "timer_running"
					? "Pause the timer before changing the remaining time."
					: "Enter a positive whole number of minutes.",
			);
			retimeInput.current.select();
			return;
		}

		stopEditingTime(restoreFocus);
	};

	const handleRetimeSubmit = (
		event: SyntheticEvent<HTMLFormElement, SubmitEvent>,
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

	const pin = (popover: HTMLDivElement) => {
		if (isPinned) return;

		const bounds = popover.getBoundingClientRect();
		setPopoverPosition({ left: bounds.left, top: bounds.top });
		store.update({ isPinned: true });
	};

	const dismiss = (restoreFocus: boolean) => {
		setPopoverPosition(null);
		store.update({ isPinned: false, isDismissed: true });
		if (restoreFocus) {
			container
				.querySelector<HTMLElement>(
					".interval-timer-status-bar-compact",
				)
				?.focus({ preventScroll: true });
		}
	};

	const handlePopoverPointerDown = (
		event: ReactPointerEvent<HTMLDivElement>,
	) => {
		if (!isPinned) return;
		if (isNonDraggableTarget(event.target)) return;

		const bounds = event.currentTarget.getBoundingClientRect();
		setDrag({
			pointerId: event.pointerId,
			offsetX: event.clientX - bounds.left,
			offsetY: event.clientY - bounds.top,
		});
		event.currentTarget.setPointerCapture?.(event.pointerId);
	};

	const handlePopoverPointerMove = (
		event: ReactPointerEvent<HTMLDivElement>,
	) => {
		if (drag?.pointerId !== event.pointerId) return;

		const bounds = event.currentTarget.getBoundingClientRect();
		setPopoverPosition({
			left: clamp(
				event.clientX - drag.offsetX,
				window.innerWidth - bounds.width,
			),
			top: clamp(
				event.clientY - drag.offsetY,
				window.innerHeight - bounds.height,
			),
		});
	};

	const handlePopoverKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.target !== event.currentTarget) return;
		if (isPinned || !isPinKey(event.key)) return;

		event.preventDefault();
		pin(event.currentTarget);
	};

	const handlePopoverPointerEnd = () => {
		setDrag(null);
	};

	const popoverClassName = [
		"interval-timer-popover",
		intervalTimerState === "focus"
			? "interval-timer-popover-focus"
			: "interval-timer-popover-break",
		isPinned && "interval-timer-popover-pinned",
		drag && "interval-timer-popover-dragging",
		isDismissed && "interval-timer-popover-dismissed",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			className={popoverClassName}
			style={popoverPosition ?? undefined}
			role="group"
			aria-label={
				isPinned
					? "Floating timer"
					: "Timer popover. Press Enter to pin."
			}
			tabIndex={0}
			onPointerDown={handlePopoverPointerDown}
			onPointerMove={handlePopoverPointerMove}
			onPointerUp={handlePopoverPointerEnd}
			onPointerCancel={handlePopoverPointerEnd}
			onLostPointerCapture={handlePopoverPointerEnd}
			onKeyDown={handlePopoverKeyDown}
			onContextMenu={(event) => blurFocusWithin(event.currentTarget)}
			onClick={(event) => {
				event.stopPropagation();
				pin(event.currentTarget);
			}}
		>
			<button
				type="button"
				className="interval-timer-popover-close"
				aria-label="Close"
				aria-hidden={!isPinned}
				tabIndex={isPinned ? 0 : -1}
				onClick={(event) => {
					event.stopPropagation();
					setIsEditingTime(false);
					dismiss(event.detail === 0);
					event.currentTarget.blur();
				}}
			>
				<Icon name="x" className="interval-timer-popover-close-icon" />
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
							style={{ strokeDashoffset: remainingPercent - 100 }}
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
									ref={minutesButton}
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
										ref={retimeInput}
										type="text"
										inputMode="numeric"
										pattern="[0-9]*"
										className="interval-timer-popover-inline-retime-input"
										autoComplete="off"
										spellCheck={false}
										defaultValue={time.minutes}
										onKeyDown={handleRetimeInputKeyDown}
										onClick={(event) =>
											event.currentTarget.select()
										}
										onBlur={() => {
											if (suppressBlurApply.current) {
												suppressBlurApply.current = false;
												return;
											}
											if (isEditingTime)
												applyRetime(false);
										}}
									/>
								</form>
							</div>
							<span className="interval-timer-popover-clock-separator">
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
						}`}
					>
						{taskName}
					</div>
					<div className="interval-timer-popover-task-actions">
						<Action
							className="interval-timer-popover-touch-action"
							icon={touchActionPresentation.icon}
							disabled={!intervalTimer}
							onClick={() => {
								if (!intervalTimer) return;

								intervalTimer.touch();
								store.update({
									touchAction: intervalTimer.predictTouch(),
								});
							}}
						>
							{touchActionPresentation.label}
						</Action>
						<Action
							className="interval-timer-popover-reset-set"
							icon="rotate-ccw"
							onClick={() => intervalTimer?.resetIntervalsSet()}
						>
							Reset set
						</Action>
					</div>
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

const isNonDraggableTarget = (target: EventTarget | null): boolean =>
	target instanceof Element && target.closest("button, input, form") !== null;

const isPinKey = (key: string): boolean => key === "Enter" || key === " ";

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

const Icon = ({ name, className }: { name: string; className?: string }) => (
	<span
		className={className}
		aria-hidden="true"
		ref={(el) => {
			if (el) setIcon(el, name);
		}}
	/>
);

type ActionProps = {
	className: string;
	icon: string;
	disabled?: boolean;
	onClick: MouseEventHandler<HTMLButtonElement>;
	children: string;
};

const Action = ({
	className,
	icon,
	disabled = false,
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
		<Icon name={icon} className="interval-timer-popover-task-action-icon" />
		<span>{children}</span>
	</button>
);
