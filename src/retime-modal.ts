import { App, Modal, Notice } from "obsidian";
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

		const title = document.createElement("h3");
		title.textContent = "Retime";
		contentEl.appendChild(title);

		const input = document.createElement("input");
		input.type = "number";
		input.min = "1";
		input.placeholder = "Minutes";
		input.style.width = "160px";
		input.style.marginBottom = "8px";
		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				this.apply(input.value);
			}
		});
		contentEl.appendChild(input);

		const actions = document.createElement("div");
		actions.style.marginTop = "4px";
		const applyButton = document.createElement("button");
		applyButton.textContent = "Apply";
		applyButton.addEventListener("click", () => this.apply(input.value));
		const cancelButton = document.createElement("button");
		cancelButton.textContent = "Cancel";
		cancelButton.addEventListener("click", () => this.close());
		actions.append(applyButton, cancelButton);
		contentEl.appendChild(actions);
	}

	public override onClose(): void {
		this.contentEl.textContent = "";
	}

	private apply(value: string): void {
		const minutes = Number(value);
		if (!Number.isFinite(minutes) || minutes <= 0) {
			new Notice("Please enter a positive number of minutes.");
			return;
		}

		const updated = this.intervalTimer.retime(minutes);
		if (!updated) {
			new Notice("Retime is available only when the timer is stopped.");
			return;
		}

		this.close();
	}
}
