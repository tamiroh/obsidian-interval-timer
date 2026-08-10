import {
	IntervalTimerState,
	intervalTimerStates,
	Snapshot,
} from "./interval-timer";
import { KeyValueStore } from "./key-value-store";
import { Time } from "./time";
import {
	parseMinutes,
	parseNonNegativeInteger,
	parseSeconds,
} from "./value-parser";

const isIntervalTimerState = (value: string): value is IntervalTimerState =>
	intervalTimerStates.some((state) => state === value);

export class IntervalTimerSnapshotStore {
	private readonly keyValueStore: KeyValueStore;

	constructor(keyValueStore: KeyValueStore) {
		this.keyValueStore = keyValueStore;
	}

	public load(): Snapshot | null {
		const state = this.keyValueStore.get("timerState");
		const minutes = this.keyValueStore.get("time-minutes");
		const seconds = this.keyValueStore.get("time-seconds");
		const total = this.keyValueStore.get("intervals-total");
		const set = this.keyValueStore.get("intervals-set");
		const negative = this.keyValueStore.get("time-negative");
		const nextState = this.keyValueStore.get("next-timer-state");
		if (
			state === null ||
			minutes === null ||
			seconds === null ||
			total === null ||
			set === null
		) {
			return null;
		}

		if (!isIntervalTimerState(state)) {
			return null;
		}

		if (negative !== null && negative !== "true") {
			return null;
		}
		if (nextState !== null && !isIntervalTimerState(nextState)) {
			return null;
		}

		const parsedMinutes = parseMinutes(minutes);
		const parsedSeconds = parseSeconds(seconds);
		const parsedTotal = parseNonNegativeInteger(total);
		const parsedSet = parseNonNegativeInteger(set);
		if (
			!parsedMinutes.ok ||
			!parsedSeconds.ok ||
			!parsedTotal.ok ||
			!parsedSet.ok
		) {
			return null;
		}
		if (parsedSet.value > parsedTotal.value) {
			return null;
		}

		return {
			state,
			minutes: parsedMinutes.value,
			seconds: parsedSeconds.value,
			...(negative === "true" ? { negative: true as const } : {}),
			...(nextState !== null ? { nextState } : {}),
			focusIntervals: {
				total: parsedTotal.value,
				set: parsedSet.value,
			},
		};
	}

	public save(
		state: IntervalTimerState,
		time: Time & { nextState?: IntervalTimerState },
		focusIntervals: { total: number; set: number },
	): void {
		this.keyValueStore.set("timerState", state);
		this.keyValueStore.set("time-minutes", String(time.minutes));
		this.keyValueStore.set("time-seconds", String(time.seconds));
		if (time.negative) {
			this.keyValueStore.set("time-negative", "true");
		} else {
			this.keyValueStore.delete("time-negative");
		}
		if (time.nextState) {
			this.keyValueStore.set("next-timer-state", time.nextState);
		} else {
			this.keyValueStore.delete("next-timer-state");
		}
		this.keyValueStore.set("intervals-set", String(focusIntervals.set));
		this.keyValueStore.set("intervals-total", String(focusIntervals.total));
	}
}
