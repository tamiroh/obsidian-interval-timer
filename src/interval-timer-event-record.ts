import { intervalTimerStates, type IntervalTimerEvent } from "./interval-timer";
import type { Infer, Schema } from "./schema";

export const intervalTimerEventRecordTypes = [
	"timer-started",
	"timer-paused",
	"timer-reset",
	"interval-completed",
	"interval-skipped",
] as const;

export const intervalTimerEventRecordSchema = {
	type: "object",
	properties: {
		occurredAt: { type: "date" },
		type: { type: "enum", values: intervalTimerEventRecordTypes },
		state: { type: "enum", values: intervalTimerStates },
		task: {
			type: "object",
			nullable: true,
			properties: {
				name: { type: "string" },
				path: { type: "string" },
			},
		},
	},
} as const satisfies Schema;

export type IntervalTimerEventRecord = Infer<
	typeof intervalTimerEventRecordSchema
>;

export const toIntervalTimerEventRecord = (
	event: IntervalTimerEvent,
	task: IntervalTimerEventRecord["task"],
): IntervalTimerEventRecord | null => {
	if (
		event.type === "state-changed" ||
		event.type === "focus-interval-ended" ||
		event.type === "intervals-reset"
	) {
		return null;
	}
	return {
		occurredAt: event.occurredAt,
		type: event.type,
		state:
			event.type === "interval-completed" ||
			event.type === "interval-skipped"
				? event.from
				: event.snapshot.state,
		task,
	};
};
