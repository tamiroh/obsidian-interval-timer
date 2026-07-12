import { App, Modal, Notice } from "obsidian";
import { match } from "ts-pattern";
import { IntervalTimer } from "./interval-timer";

export class RetimeModal extends Modal {
	private readonly intervalTimer: IntervalTimer;

	constructor(app: App, intervalTimer: IntervalTimer) {
		super(app);
		this.intervalTimer = intervalTimer;
	}

	public override onOpen(): void {
		const { contentEl } = this;
		contentEl.textContent = "";

		const title = createEl("h3");
		title.textContent = "Retime";
		contentEl.appendChild(title);

		const input = createEl("input");
		input.type = "number";
		input.min = "1";
		input.step = "1";
		input.placeholder = "Minutes";
		input.classList.add("interval-timer-retime-input");
		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				this.apply(input.value);
			}
		});
		contentEl.appendChild(input);

		const actions = createDiv();
		actions.classList.add("interval-timer-retime-actions");
		const applyButton = createEl("button");
		applyButton.textContent = "Apply";
		applyButton.addEventListener("click", () => this.apply(input.value));
		const cancelButton = createEl("button");
		cancelButton.textContent = "Cancel";
		cancelButton.addEventListener("click", () => this.close());
		actions.append(applyButton, cancelButton);
		contentEl.appendChild(actions);
	}

	public override onClose(): void {
		this.contentEl.textContent = "";
	}

	private apply(value: string): void {
		const result = this.intervalTimer.retime(Number(value));
		if (!result.ok) {
			new Notice(
				match(result.reason)
					.with(
						"invalid_minutes",
						() =>
							"Please enter a positive whole number of minutes.",
					)
					.with(
						"timer_running",
						() =>
							"Retime is available only when the timer is stopped.",
					)
					.exhaustive(),
			);
			return;
		}

		this.close();
	}
}
