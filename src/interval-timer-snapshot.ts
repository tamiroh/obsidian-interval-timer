import {
	IntervalTimerState,
	intervalTimerStates,
	Snapshot,
} from "./interval-timer";
import { KeyValueStore } from "./key-value-store";
import * as v from "valibot";
import { minutesSchema, secondsSchema, Time, wholeNumberSchema } from "./time";

const isIntervalTimerState = (value: string): value is IntervalTimerState =>
	intervalTimerStates.some((state) => state === value);

const intervalCountSchema = v.pipe(wholeNumberSchema, v.minValue(0));

export class IntervalTimerSnapshotStore {
	private readonly keyValueStore: KeyValueStore;

	constructor(keyValueStore: KeyValueStore) {
		this.keyValueStore = keyValueStore;
	}

	public load(): Snapshot | null {
		const state = this.keyValueStore.get("timerState");
		if (state === null || !isIntervalTimerState(state)) return null;

		const minutes = this.parseField("time-minutes", minutesSchema);
		if (minutes === null) return null;

		const seconds = this.parseField("time-seconds", secondsSchema);
		if (seconds === null) return null;

		const total = this.parseField("intervals-total", intervalCountSchema);
		if (total === null) return null;

		const set = this.parseField("intervals-set", intervalCountSchema);
		if (set === null || set > total) return null;

		return {
			state,
			minutes,
			seconds,
			focusIntervals: { total, set },
		};
	}

	private parseField<TSchema extends v.GenericSchema>(
		key: string,
		fieldSchema: TSchema,
	): v.InferOutput<TSchema> | null {
		const raw = this.keyValueStore.get(key);
		if (raw === null) return null;

		const parsed = v.safeParse(fieldSchema, raw);
		return parsed.success ? parsed.output : null;
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
