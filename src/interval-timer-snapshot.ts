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
		time: Time,
		focusIntervals: { total: number; set: number },
	): void {
		this.keyValueStore.set("timerState", state);
		this.keyValueStore.set("time-minutes", String(time.minutes));
		this.keyValueStore.set("time-seconds", String(time.seconds));
		this.keyValueStore.set("intervals-set", String(focusIntervals.set));
		this.keyValueStore.set("intervals-total", String(focusIntervals.total));
	}
}
