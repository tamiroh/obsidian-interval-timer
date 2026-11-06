import { type App, Modal, Notice } from "obsidian";
import { match } from "ts-pattern";
import type { EventStore } from "./event-store";
import type {
	IntervalTimerEventRecord,
	IntervalTimerEventRecordType,
} from "./interval-timer-event-record";
import type { TaskReference } from "./obsidian-task-tracker";

const eventLabel = (type: IntervalTimerEventRecordType): string =>
	match(type)
		.with("timer-started", () => "Started")
		.with("timer-paused", () => "Paused")
		.with("timer-reset", () => "Reset")
		.with("interval-completed", () => "Completed")
		.with("interval-skipped", () => "Skipped")
		.exhaustive();

export class TaskEventModal extends Modal {
	private readonly task: TaskReference;

	private readonly eventStore: EventStore<IntervalTimerEventRecord>;

	constructor(
		app: App,
		task: TaskReference,
		eventStore: EventStore<IntervalTimerEventRecord>,
	) {
		super(app);
		this.task = task;
		this.eventStore = eventStore;
	}

	public override onOpen(): void {
		this.setTitle(`Timer events: ${this.task.name}`);
		this.eventStore
			.find()
			.then((records) => {
				const events = records.filter((record) =>
					record.isFor(this.task),
				);
				if (events.length === 0) {
					this.contentEl.createEl("p", {
						text: "No timer events found.",
					});
					return;
				}
				const list = this.contentEl.createEl("ul");
				[...events].reverse().forEach((event) => {
					list.createEl("li", {
						text: `${event.occurredAt.toLocaleString()} — ${eventLabel(event.type)} (${event.state})`,
					});
				});
			})
			.catch((error: unknown) => {
				console.error(
					"Interval Timer: failed to load timer events.",
					error,
				);
				this.close();
				new Notice("Failed to load timer events.");
			});
	}

	public override onClose(): void {
		this.contentEl.empty();
	}
}
