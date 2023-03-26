import { Notice, Plugin as BasePlugin } from "obsidian";
import { SettingTab } from "./setting/settingTab";
import { Setting } from "./setting/types";
import { DEFAULT_SETTINGS } from "./setting/default";
import { CountdownTimer } from "./timer/countdownTimer";
import { Time } from "./time/time";
import { format } from "./utils/time";

export default class Plugin extends BasePlugin {
	settings: Setting;

	statusBarItem: HTMLElement;

	timer: CountdownTimer;

	override onload = async () => {
		await this.loadSettings();
		this.initializeStatusBar();
		this.addCommands();
		this.addSettingTab(new SettingTab(this.app, this));
	};

	initializeStatusBar = () => {
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText(
			`(Initialized) ${format(
				new Time(this.settings.focusIntervalDuration, 0)
			)}`
		);
	};

	addCommands = () => {
		this.addCommand({
			id: "start-timer",
			name: "Start timer",
			callback: () => {
				if (this.timer == null) {
					this.timer = new CountdownTimer(
						new Time(this.settings.focusIntervalDuration, 0),
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
				this.statusBarItem.setText(
					`(Running) ${format(
						new Time(this.settings.focusIntervalDuration, 0)
					)}`
				);
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
	};

	loadSettings = async () => {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	};

	saveSettings = async () => {
		await this.saveData(this.settings);
	};
}
