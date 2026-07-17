import {
	KeyboardEvent,
	MouseEventHandler,
	SyntheticEvent,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { createRoot, Root } from "react-dom/client";
import { Notice } from "obsidian";
import { TimerType } from "./countdown-timer";
import { IntervalTimer, IntervalTimerState } from "./interval-timer";
import { ObservableStore } from "./observable-store";
import { Time, toSeconds } from "./time";

const setRingRadius = 35;
const setRingStrokeWidth = 3.5;
const setRingCapOffsetDegrees =
	(Math.atan(setRingStrokeWidth / 2 / setRingRadius) * 180) / Math.PI;

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
	intervalTimer: IntervalTimer | null;
};

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
		intervalTimer: null,
	});

	private intervalTotalSeconds = 0;

	constructor(private readonly container: HTMLElement) {
		this.rootElement = container.createSpan();
		this.root = createRoot(this.rootElement);
		container.addEventListener("mouseleave", this.handleMouseLeave);
		this.root.render(<Popover store={this.store} />);
	}

	public dispose(): void {
		this.container.removeEventListener("mouseleave", this.handleMouseLeave);
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
		});
	}

	public updateTrackedTask(currentTaskName: string | null): void {
		this.store.update({ currentTaskName });
	}

	public updateLongBreakAfter(longBreakAfter: number): void {
		this.store.update({ longBreakAfter });
	}

	public enableActions(intervalTimer: IntervalTimer): void {
		this.store.update({ intervalTimer });
	}

	private getRemainingPercent(remainingSeconds: number): number {
		if (this.intervalTotalSeconds === 0) return 0;

		return Math.min(
			100,
			Math.max(0, (remainingSeconds / this.intervalTotalSeconds) * 100),
		);
	}

	private readonly handleMouseLeave = (): void => {
		if (this.store.getSnapshot().isDismissed) {
			this.store.update({ isDismissed: false });
		}
	};
}

const Popover = ({ store }: { store: ObservableStore<PopoverSnapshot> }) => {
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
	} = useSyncExternalStore(store.subscribe, store.getSnapshot);
	const [isEditingTime, setIsEditingTime] = useState(false);
	const minutesButton = useRef<HTMLButtonElement>(null);
	const retimeInput = useRef<HTMLInputElement>(null);

	const startEditingTime = () => {
		setIsEditingTime(true);
		if (retimeInput.current) {
			retimeInput.current.value = String(time.minutes);
			retimeInput.current.focus();
			retimeInput.current.select();
		}
	};

	const stopEditingTime = (restoreFocus: boolean) => {
		setIsEditingTime(false);
		if (restoreFocus) minutesButton.current?.focus();
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

	const submitRetime = (
		event: SyntheticEvent<HTMLFormElement, SubmitEvent>,
	) => {
		event.preventDefault();
		applyRetime();
	};

	const handleRetimeKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Escape") {
			event.preventDefault();
			stopEditingTime(true);
		}
	};

	const close = () => {
		setIsEditingTime(false);
		store.update({ isPinned: false, isDismissed: true });
	};

	const popoverClassName = [
		"interval-timer-popover",
		intervalTimerState === "focus"
			? "interval-timer-popover-focus"
			: "interval-timer-popover-break",
		isPinned && "interval-timer-popover-pinned",
		isDismissed && "interval-timer-popover-dismissed",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			className={popoverClassName}
			onClick={(event) => {
				event.stopPropagation();
				store.update({ isPinned: true });
			}}
		>
			<button
				type="button"
				className="interval-timer-popover-close"
				onClick={(event) => {
					event.stopPropagation();
					close();
					event.currentTarget.blur();
				}}
			>
				×
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
									onClick={startEditingTime}
								>
									{String(time.minutes).padStart(2, "0")}
								</button>
								<form
									className="interval-timer-popover-inline-retime-form"
									onSubmit={submitRetime}
								>
									<input
										ref={retimeInput}
										type="number"
										className="interval-timer-popover-inline-retime-input"
										min="1"
										step="1"
										autoComplete="off"
										spellCheck={false}
										defaultValue={time.minutes}
										onKeyDown={handleRetimeKeyDown}
										onBlur={() => {
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
							currentTaskName === null
								? " interval-timer-popover-task-name-empty"
								: ""
						}`}
					>
						{currentTaskName ?? "No task selected"}
					</div>
					<div className="interval-timer-popover-task-actions">
						<Action
							className="interval-timer-popover-start-timer"
							icon="▶"
							disabled={
								!intervalTimer ||
								(timerState !== "initialized" &&
									timerState !== "paused")
							}
							onClick={() => intervalTimer?.start()}
						>
							Start
						</Action>
						<Action
							className="interval-timer-popover-reset-set"
							icon="↺"
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
						-90 +
						setRingCapOffsetDegrees +
						index * (360 / markerCount)
					} 50 50)`}
				/>
			))}
		</g>
	);
};

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
		onClick={onClick}
	>
		<span
			className="interval-timer-popover-task-action-icon"
			aria-hidden="true"
		>
			{icon}
		</span>
		<span>{children}</span>
	</button>
);
