import { Plugin as BasePlugin } from "obsidian";
import { SettingTab } from "./setting/settingTab";
import { Setting } from "./setting/types";
import { DEFAULT_SETTINGS } from "./setting/default";
import { IntervalTimerManager } from "./manager/intervalTimerManager";
import { format } from "./utils/time";
import { onChangeStateFunction } from "./manager/types";

export default class Plugin extends BasePlugin {
	public settings: Setting;

	private statusBarItem: HTMLElement;

	private intervalTimerManager: IntervalTimerManager;

	public override onload = async () => {
		await this.loadSettings();
		this.statusBarItem = this.addStatusBarItem();
		this.setupIntervalTimerManager();
		this.addCommands();
		this.addSettingTab(new SettingTab(this.app, this));
	};

	public saveSettings = async () => {
		await this.saveData(this.settings);
	};

	private setupIntervalTimerManager = () => {
		const onChangeState: onChangeStateFunction = (
			timerState,
			intervalTimerState,
			time,
			total
		) => {
			this.statusBarItem.setText(
				`(${total}) ${timerState} ${intervalTimerState} ${format(time)}`
			);
		};
		const onIntervalCreated = (intervalId: number) =>
			this.registerInterval(intervalId);

		this.intervalTimerManager = new IntervalTimerManager(
			onChangeState,
			this.settings,
			onIntervalCreated
		);
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
