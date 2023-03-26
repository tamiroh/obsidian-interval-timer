import { Notice, Plugin } from "obsidian";
import { SettingTab } from "./setting/settingTab";
import { Setting } from "./setting/types";
import { DEFAULT_SETTINGS } from "./setting/default";
import { CountdownTimer } from "./timer/countdownTimer";
import { Time } from "./time/time";
import { format } from "./utils/time";

export default class IntervalTimerPlugin extends Plugin {
	settings: Setting;

	statusBarItem: HTMLElement;

	timer: CountdownTimer;

	override async onload() {
		await this.loadSettings();
		this.statusBarItem = this.addStatusBarItem();
		this.addCommands();
		this.addSettingTab(new SettingTab(this.app, this));
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
							this.statusBarItem.setText(
								`(Running) ${format(time)}`
							);
						},
						(current) => {
							this.statusBarItem.setText(
								`(Paused) ${format(current)}`
							);
						},
						() => {
							new Notice("completed!");
							this.statusBarItem.setText(`(Completed) 00:00`);
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
					this.statusBarItem.setText(
						`(Initialized) ${format(result.resetTo)}`
					);
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
