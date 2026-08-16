import {
	IntervalTimerState,
	intervalTimerStates,
	Snapshot,
} from "./interval-timer";
import { KeyValueStore } from "./key-value-store";
import { Time } from "./time";
import type { Result } from "./result";
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
		if (state === null || !isIntervalTimerState(state)) return null;

		const minutes = this.parseField("time-minutes", parseMinutes);
		if (minutes === null) return null;

		const negative = this.keyValueStore.get("time-negative");
		if (negative !== null && negative !== "true") {
			return null;
		}
		const nextState = this.keyValueStore.get("next-timer-state");
		if (nextState !== null && !isIntervalTimerState(nextState)) {
			return null;
		}

		const seconds = this.parseField("time-seconds", parseSeconds);
		if (seconds === null) return null;

		const total = this.parseField(
			"intervals-total",
			parseNonNegativeInteger,
		);
		if (total === null) return null;

		const set = this.parseField("intervals-set", parseNonNegativeInteger);
		if (set === null || set > total) return null;

		return {
			state,
			minutes,
			seconds,
			...(negative === "true" ? { negative: true as const } : {}),
			...(nextState !== null ? { nextState } : {}),
			focusIntervals: { total, set },
		};
	}

	private parseField<T>(
		key: string,
		parse: (value: string) => Result<T, string>,
	): T | null {
		const raw = this.keyValueStore.get(key);
		if (raw === null) return null;

		const parsed = parse(raw);
		return parsed.ok ? parsed.value : null;
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
