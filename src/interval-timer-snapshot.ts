import {
	IntervalTimerState,
	intervalTimerStates,
	Snapshot,
} from "./interval-timer";
import { KeyValueStore } from "./key-value-store";
import * as v from "valibot";
import { parseMinutes, parseSeconds, Time } from "./time";

const isIntervalTimerState = (value: string): value is IntervalTimerState =>
	intervalTimerStates.some((state) => state === value);

const intervalCountSchema = v.pipe(
	v.union([v.number(), v.pipe(v.string(), v.toNumber())]),
	v.finite(),
	v.integer(),
	v.minValue(0),
);

const parseIntervalCount = (value: unknown): number | null => {
	const result = v.safeParse(intervalCountSchema, value);
	return result.success ? result.output : null;
};

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

		const total = this.parseField("intervals-total", parseIntervalCount);
		if (total === null) return null;

		const set = this.parseField("intervals-set", parseIntervalCount);
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
		parse: (value: unknown) => T | null,
	): T | null {
		const raw = this.keyValueStore.get(key);
		return raw === null ? null : parse(raw);
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
