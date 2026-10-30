import { match, P } from "ts-pattern";
import * as v from "valibot";
import {
	intervalTimerStates,
	type IntervalTimerEvent,
	type IntervalTimerState,
} from "./interval-timer";

export const intervalTimerEventRecordTypes = [
	"timer-started",
	"timer-paused",
	"timer-reset",
	"interval-completed",
	"interval-skipped",
] as const;

export type IntervalTimerEventRecordType =
	(typeof intervalTimerEventRecordTypes)[number];

export type IntervalTimerEventTask = {
	name: string;
	path: string;
};

const recordSchema = v.object({
	occurredAt: v.pipe(
		v.string(),
		v.isoTimestamp(),
		v.transform((value) => new Date(value)),
	),
	type: v.picklist(intervalTimerEventRecordTypes),
	state: v.picklist(intervalTimerStates),
	task: v.nullable(v.object({ name: v.string(), path: v.string() })),
});

export class IntervalTimerEventRecord {
	public readonly occurredAt: Date;

	public readonly type: IntervalTimerEventRecordType;

	public readonly state: IntervalTimerState;

	public readonly task: IntervalTimerEventTask | null;

	private constructor(
		occurredAt: Date,
		type: IntervalTimerEventRecordType,
		state: IntervalTimerState,
		task: IntervalTimerEventTask | null,
	) {
		this.occurredAt = occurredAt;
		this.type = type;
		this.state = state;
		this.task = task;
	}

	public static from(
		event: IntervalTimerEvent,
		task: IntervalTimerEventTask | null,
	): IntervalTimerEventRecord | null {
		return match(event)
			.with(
				{ type: P.union("interval-completed", "interval-skipped") },
				({ type, occurredAt, from }) =>
					new IntervalTimerEventRecord(occurredAt, type, from, task),
			)
			.with(
				{
					type: P.union(
						"timer-started",
						"timer-paused",
						"timer-reset",
					),
				},
				({ type, occurredAt, snapshot }) =>
					new IntervalTimerEventRecord(
						occurredAt,
						type,
						snapshot.state,
						task,
					),
			)
			.with(
				{
					type: P.union(
						"state-changed",
						"timer-completed",
						"focus-interval-ended",
						"intervals-reset",
						"timer-retimed",
					),
				},
				() => null,
			)
			.exhaustive();
	}

	public static parse(value: unknown): IntervalTimerEventRecord | null {
		const result = v.safeParse(recordSchema, value);
		if (!result.success) return null;

		const { occurredAt, type, state, task } = result.output;
		return new IntervalTimerEventRecord(occurredAt, type, state, task);
	}

	public isFor(task: IntervalTimerEventTask): boolean {
		return this.task?.name === task.name && this.task.path === task.path;
	}

	public toJSON(): {
		occurredAt: string;
		type: IntervalTimerEventRecordType;
		state: IntervalTimerState;
		task: IntervalTimerEventTask | null;
	} {
		return {
			occurredAt: this.occurredAt.toISOString(),
			type: this.type,
			state: this.state,
			task: this.task,
		};
	}
}
