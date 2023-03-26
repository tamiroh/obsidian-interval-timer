import { Notice, Plugin } from "obsidian";
import { SampleSettingTab } from "./sampleSettingTab";
import { Settings } from "./types/Settings";
import { DEFAULT_SETTINGS } from "./constants";
import { CountdownTimer } from "./timer/countdownTimer";
import { Time } from "./time/time";
import { format } from "./utils/time";

export default class MyPlugin extends Plugin {
	settings: Settings;

	statusBarItem: HTMLElement;

	timer: CountdownTimer;

	override async onload() {
		await this.loadSettings();
		this.addRibbonIcon("dice", "Sample Plugin", () => {
			new Notice("This is a notice!");
		});
		this.statusBarItem = this.addStatusBarItem();
		this.addCommands();
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	addCommands() {
		this.addCommand({
			id: "start-timer",
			name: "Start timer",
			callback: () => {
				if (this.timer == null) {
					this.timer = new CountdownTimer(
						new Time(1, 0),
						(time: Time) => {
							this.statusBarItem.setText(format(time));
						},
						() => {
							new Notice("completed!");
						}
					);
				}
				this.timer.start();
				const intervalId = this.timer.getIntervalId();
				if (intervalId != null) {
					this.registerInterval(intervalId);
				}
			},
		});
		this.addCommand({
			id: "pause-timer",
			name: "Pause timer",
			callback: () => {
				this.timer.pause();
			},
		});
		this.addCommand({
			id: "reset-timer",
			name: "Reset timer",
			callback: () => {
				const result = this.timer.reset();
				if (result.type === "succeeded") {
					this.statusBarItem.setText(format(result.resetTo));
				}
			},
		});
	}

	async loadSettings() {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
