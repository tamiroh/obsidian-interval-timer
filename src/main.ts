import { Plugin as BasePlugin } from "obsidian";
import { SettingTab } from "./setting/settingTab";
import { Setting } from "./setting/types";
import { DEFAULT_SETTINGS } from "./setting/default";
import { IntervalTimerManager } from "./manager/intervalTimerManager";
import { format } from "./utils/time";

export default class Plugin extends BasePlugin {
	public settings: Setting;

	private statusBarItem: HTMLElement;

	private intervalTimerManager: IntervalTimerManager;

	public override onload = async () => {
		await this.loadSettings();
		this.statusBarItem = this.addStatusBarItem();
		this.intervalTimerManager = new IntervalTimerManager(
			(timerState, intervalTimerState, time) => {
				this.statusBarItem.setText(
					`${timerState} ${intervalTimerState} ${format(time)}`
				);
			},
			this.settings,
			(intervalId) => this.registerInterval(intervalId)
		);
		this.addCommands();
		this.addSettingTab(new SettingTab(this.app, this));
	};

	public saveSettings = async () => {
		await this.saveData(this.settings);
	};

	private addCommands = () => {
		this.addCommand({
			id: "start-timer",
			name: "Start timer",
			callback: this.intervalTimerManager.startTimer,
		});
		this.addCommand({
			id: "pause-timer",
			name: "Pause timer",
			callback: this.intervalTimerManager.pauseTimer,
		});
		this.addCommand({
			id: "reset-timer",
			name: "Reset timer",
			callback: this.intervalTimerManager.resetTimer,
		});
	};

	private loadSettings = async () => {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	};
}
