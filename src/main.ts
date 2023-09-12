import { Plugin as BasePlugin } from "obsidian";
import { DEFAULT_SETTINGS, PluginSetting, SettingTab } from "./settingTab";
import {
	IntervalTimer,
	IntervalTimerState,
	onChangeStateFunction,
} from "./intervalTimer";
import { StatusBar } from "./statusBar";
import { Seconds } from "./time";
import { KeyValueStore } from "./keyValueStore";
import { notify } from "./notifier";

export default class Plugin extends BasePlugin {
	public settings!: PluginSetting;

	private statusBar!: StatusBar;

	private intervalTimer!: IntervalTimer;

	private keyValueStore!: KeyValueStore;

	public override onload = async () => {
		await this.loadSettings();
		this.keyValueStore = new KeyValueStore(this.manifest.id);
		this.statusBar = new StatusBar(this.addStatusBarItem());
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
			this.keyValueStore.set("timerState", intervalTimerState);
			this.keyValueStore.set("time-minutes", String(time.minutes));
			this.keyValueStore.set("time-seconds", String(time.seconds));
			this.keyValueStore.set("intervals-set", String(intervals.set));
			this.keyValueStore.set("intervals-total", String(intervals.total));

			this.statusBar.update(intervals, time, intervalTimerState);
		};
		const onIntervalCreated = (intervalId: number) =>
			this.registerInterval(intervalId);
		const notifier = (message: string) => {
			notify(this.settings.notificationStyle, message);
		};
		const initialParams = {
			minutes: parseInt(
				this.keyValueStore.get("time-minutes") as string,
				10,
			),
			seconds: parseInt(
				this.keyValueStore.get("time-seconds") as string,
				10,
			) as Seconds,
			state: this.keyValueStore.get("timerState") as IntervalTimerState,
			focusIntervals: {
				total: parseInt(
					this.keyValueStore.get("intervals-total") as string,
					10,
				),
				set: parseInt(
					this.keyValueStore.get("intervals-set") as string,
					10,
				),
			},
		};

		this.intervalTimer = new IntervalTimer(
			onChangeState,
			this.settings,
			onIntervalCreated,
			notifier,
			initialParams,
		);
	};

	private addCommands = () => {
		this.addCommand({
			id: "start-timer",
			name: "Start timer",
			callback: this.intervalTimer.start,
		});
		this.addCommand({
			id: "pause-timer",
			name: "Pause timer",
			callback: this.intervalTimer.pause,
		});
		this.addCommand({
			id: "reset-timer",
			name: "Reset timer",
			callback: this.intervalTimer.reset,
		});
		this.addCommand({
			id: "reset-intervals-set",
			name: "Reset intervals set",
			callback: this.intervalTimer.resetIntervalsSet,
		});
		this.addCommand({
			id: "reset-total-intervals",
			name: "Reset total intervals",
			callback: this.intervalTimer.resetTotalIntervals,
		});
		this.addCommand({
			id: "skip-interval", // TODO: only show this command when the timer type is break
			name: "Skip interval",
			callback: this.intervalTimer.skipInterval,
		});
	};

	private loadSettings = async () => {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	};
}
