import { Modal, Notice, type App } from "obsidian";
import type { EventStore } from "./event-store";
import type {
	IntervalTimerEventRecord,
	intervalTimerEventRecordSchema,
} from "./interval-timer-event-record";
import type { TaskReference } from "./task-tracker";

const eventLabels: Record<IntervalTimerEventRecord["type"], string> = {
	"timer-started": "Started",
	"timer-paused": "Paused",
	"timer-reset": "Reset",
	"interval-completed": "Completed",
	"interval-skipped": "Skipped",
};

export class TaskEventModal extends Modal {
	constructor(
		app: App,
		private readonly task: TaskReference,
		private readonly eventStore: EventStore<
			typeof intervalTimerEventRecordSchema
		>,
	) {
		super(app);
	}

	public override async onOpen(): Promise<void> {
		this.contentEl.replaceChildren();
		const title = this.contentEl.createEl("h2");
		title.textContent = `Timer events: ${this.task.name}`;

		try {
			const events = (await this.eventStore.find()).filter(
				(event) =>
					event.task?.name === this.task.name &&
					event.task.path === this.task.path,
			);

			if (events.length === 0) {
				const emptyMessage = this.contentEl.createEl("p");
				emptyMessage.textContent = "No timer events found.";
				return;
			}

			const list = this.contentEl.createEl("ul");
			[...events].reverse().forEach((event) => {
				const item = list.createEl("li");
				item.textContent = `${event.occurredAt.toLocaleString()} — ${eventLabels[event.type]} (${event.state})`;
			});
		} catch {
			this.close();
			new Notice("Failed to load timer events.");
		}
	}

	public override onClose(): void {
		this.contentEl.replaceChildren();
	}
}
