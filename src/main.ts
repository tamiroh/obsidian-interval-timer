import { Notice, Plugin as BasePlugin } from "obsidian";
import * as electron from "electron";
import { SettingTab } from "./setting/settingTab";
import { PluginSetting } from "./setting/types";
import { DEFAULT_SETTINGS } from "./setting/default";
import {
	IntervalTimerManager,
	onChangeStateFunction,
} from "./intervalTimerManager";
import { format } from "./utils/time";

export default class Plugin extends BasePlugin {
	public settings!: PluginSetting;

	private statusBarItem!: HTMLElement;

	private intervalTimerManager!: IntervalTimerManager;

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
			intervals,
		) => {
			this.statusBarItem.setText(
				`${intervals.set}/${intervals.total} ${format(time)}`,
			);
			this.statusBarItem.setAttribute(
				"style",
				intervalTimerState === "focus"
					? "color: #EE6152"
					: "color: #4CBD4F",
			);
		};
		const onIntervalCreated = (intervalId: number) =>
			this.registerInterval(intervalId);
		const notifier = (message: string) => {
			new (electron as any).remote.Notification({
				title: message,
				body: "Interval Timer",
			}).show();
			new Notice(message);
		};

		this.intervalTimerManager = new IntervalTimerManager(
			onChangeState,
			this.settings,
			onIntervalCreated,
			notifier,
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
		this.addCommand({
			id: "reset-intervals-set",
			name: "Reset intervals set",
			callback: this.intervalTimerManager.resetIntervalsSet,
		});
		this.addCommand({
			id: "skip-interval", // TODO: only show this command when the timer type is break
			name: "Skip interval",
			callback: this.intervalTimerManager.skipInterval,
		});
	};

	private loadSettings = async () => {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	};
}
