import {
	intervalTimerStates,
	type IntervalTimerState,
	type Snapshot,
} from "./interval-timer";
import { type KeyValueStore } from "./key-value-store";
import * as v from "valibot";
import {
	isMinutes,
	isNonZeroMinutes,
	isSeconds,
	negativeTime,
	time,
	type Seconds,
	type Time,
} from "./time";

const snapshotKey = "snapshot";

const intervalCountSchema = v.pipe(v.number(), v.integer(), v.minValue(0));

const storedMinutesSchema = v.pipe(v.number(), v.integer(), v.minValue(0));

const snapshotSchema = v.pipe(
	v.object({
		state: v.picklist(intervalTimerStates),
		minutes: storedMinutesSchema,
		seconds: v.pipe(v.number(), v.integer(), v.guard(isSeconds)),
		negative: v.optional(v.literal(true)),
		nextState: v.optional(v.picklist(intervalTimerStates)),
		focusIntervals: v.object({
			total: intervalCountSchema,
			set: intervalCountSchema,
		}),
	}),
	v.check(({ minutes, seconds, negative }) =>
		negative === true
			? (minutes > 0 || seconds > 0) && isMinutes(minutes)
			: isMinutes(minutes),
	),
	v.check(
		({ negative, nextState }) =>
			negative !== true || nextState !== undefined,
	),
	v.check(({ focusIntervals }) => focusIntervals.set <= focusIntervals.total),
);

export class IntervalTimerSnapshotStore {
	private readonly keyValueStore: KeyValueStore;

	constructor(keyValueStore: KeyValueStore) {
		this.keyValueStore = keyValueStore;
	}

	public load(): Snapshot | null {
		const result = v.safeParse(
			snapshotSchema,
			this.keyValueStore.get(snapshotKey)?.as("object"),
		);
		if (!result.success) {
			return null;
		}

		const snapshot = result.output;
		const optionalState = snapshot.nextState
			? { nextState: snapshot.nextState }
			: {};
		if (snapshot.negative === true) {
			const currentTime = toNegativeTime(
				snapshot.minutes,
				snapshot.seconds,
			);
			if (currentTime === null) {
				return null;
			}
			return {
				state: snapshot.state,
				...currentTime,
				...optionalState,
				focusIntervals: snapshot.focusIntervals,
			};
		}
		if (!isMinutes(snapshot.minutes)) {
			return null;
		}

		return {
			state: snapshot.state,
			...time(snapshot.minutes, snapshot.seconds),
			...optionalState,
			focusIntervals: snapshot.focusIntervals,
		};
	}

	public save(
		state: IntervalTimerState,
		currentTime: Time & { nextState?: IntervalTimerState },
		focusIntervals: { total: number; set: number },
	): void {
		this.keyValueStore.set(snapshotKey, {
			state,
			minutes: currentTime.minutes,
			seconds: currentTime.seconds,
			...(currentTime.negative ? { negative: true as const } : {}),
			...(currentTime.nextState
				? { nextState: currentTime.nextState }
				: {}),
			focusIntervals: {
				total: focusIntervals.total,
				set: focusIntervals.set,
			},
		});
	}
}

const toNegativeTime = (minutes: number, seconds: Seconds): Time | null => {
	if (minutes === 0) {
		return seconds === 0 ? null : negativeTime(0, seconds);
	}
	if (!isNonZeroMinutes(minutes)) {
		return null;
	}
	return negativeTime(minutes, seconds);
};
