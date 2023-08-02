import { Notice, Plugin as BasePlugin } from "obsidian";
import * as electron from "electron";
import { DEFAULT_SETTINGS, PluginSetting, SettingTab } from "./settingTab";
import {
	IntervalTimerManager,
	onChangeStateFunction,
} from "./intervalTimerManager";
import { StatusBar } from "./statusBar";
import { Seconds } from "./time";

export default class Plugin extends BasePlugin {
	public settings!: PluginSetting;

	private statusBar!: StatusBar;

	private intervalTimerManager!: IntervalTimerManager;

	public override onload = async () => {
		await this.loadSettings();
		this.statusBar = new StatusBar(this.addStatusBarItem());
		this.setupIntervalTimerManager();
		this.addCommands();
		this.addSettingTab(new SettingTab(this.app, this));
	};

	public saveSettings = async () => {
		await this.saveData(this.settings);
	};

	private setupIntervalTimerManager = () => {
		const prefix = `${this.manifest.id}`;

		const onChangeState: onChangeStateFunction = (
			timerState,
			intervalTimerState,
			time,
			intervals,
		) => {
			localStorage[`${prefix}:timerState`] = intervalTimerState;
			localStorage[`${prefix}:time-minutes`] = time.minutes;
			localStorage[`${prefix}:time-seconds`] = time.seconds;
			localStorage[`${prefix}:intervals-set`] = intervals.set;
			localStorage[`${prefix}:intervals-total`] = intervals.total;

			this.statusBar.update(intervals, time, intervalTimerState);
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
			{
				minutes: parseInt(localStorage[`${prefix}:time-minutes`], 10),
				seconds: parseInt(
					localStorage[`${prefix}:time-seconds`],
					10,
				) as Seconds,
				state: localStorage[`${prefix}:timerState`],
				focusIntervals: {
					total: parseInt(
						localStorage[`${prefix}:intervals-total`],
						10,
					),
					set: parseInt(localStorage[`${prefix}:intervals-set`], 10),
				},
			},
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
			id: "reset-total-intervals",
			name: "Reset total intervals",
			callback: this.intervalTimerManager.resetTotalIntervals,
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
