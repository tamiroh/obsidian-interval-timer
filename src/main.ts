import { App, Plugin as BasePlugin, PluginManifest } from "obsidian";
import { match } from "ts-pattern";
import { DEFAULT_SETTINGS, PluginSetting, SettingTab } from "./setting-tab";
import {
	IntervalTimer,
	IntervalTimerState,
	NotifierContext,
	onChangeStateFunction,
} from "./interval-timer";
import { StatusBar } from "./status-bar";
import { Seconds } from "./time";
import { KeyValueStore } from "./key-value-store";
import { notify } from "./notifier";
import { FlashOverlay } from "./flash-overlay";

export default class Plugin extends BasePlugin {
	public settings!: PluginSetting;

	private statusBar: StatusBar;

	private intervalTimer!: IntervalTimer;

	private keyValueStore: KeyValueStore;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		this.keyValueStore = new KeyValueStore(manifest.id);
		this.statusBar = new StatusBar(this.addStatusBarItem());
	}

	public override onload = async () => {
		await this.loadSettings();
		this.setupIntervalTimer();
		this.addCommands();
		this.addSettingTab(new SettingTab(this.app, this));

		this.statusBar.enableClick(this.intervalTimer);
	};

	public override onunload = () => {
		FlashOverlay.dispose();
		this.intervalTimer.dispose();
	};

	public saveSettings = async () => {
		await this.saveData(this.settings);
	};

	private setupIntervalTimer = () => {
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
		const notifier = (message: string, context: NotifierContext) => {
			if (context.callContext["dont-flash"] !== true) {
				const overlayColor = match(context.state)
					.with("focus", () => ({ r: 255, g: 100, b: 100 }))
					.with("shortBreak", "longBreak", () => ({
						r: 100,
						g: 255,
						b: 100,
					}))
					.exhaustive();
				FlashOverlay.getInstance().show(overlayColor);
			}
			notify(this.settings.notificationStyle, message);
		};
		const initialParams = {
			minutes: parseInt(
				this.keyValueStore.get("time-minutes") ?? "0",
				10,
			),
			seconds: parseInt(
				this.keyValueStore.get("time-seconds") ?? "0",
				10,
			) as Seconds,
			state: this.keyValueStore.get("timerState") as IntervalTimerState,
			focusIntervals: {
				total: parseInt(
					this.keyValueStore.get("intervals-total") ?? "0",
					10,
				),
				set: parseInt(
					this.keyValueStore.get("intervals-set") ?? "0",
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
		this.intervalTimer.enableAutoReset();
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
			callback: () =>
				this.intervalTimer.withContext(
					{ "dont-flash": true },
					(timer) => {
						timer.skipInterval();
					},
				),
		});
	};

	private loadSettings = async () => {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	};
}
