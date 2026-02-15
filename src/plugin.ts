import { App, Plugin as BasePlugin, PluginManifest } from "obsidian";
import { match } from "ts-pattern";
import { DEFAULT_SETTINGS, PluginSetting, SettingTab } from "./setting-tab";
import {
	IntervalTimer,
	NotifierContext,
	onChangeStateFunction,
} from "./interval-timer";
import { StatusBar } from "./status-bar";
import { KeyValueStore } from "./key-value-store";
import { notify } from "./notifier";
import { FlashOverlay } from "./flash-overlay";
import { IntervalTimerSnapshotStore } from "./interval-timer-snapshot";

export default class Plugin extends BasePlugin {
	public settings!: PluginSetting;

	private statusBar: StatusBar;

	private intervalTimer!: IntervalTimer;

	private keyValueStore: KeyValueStore;

	private intervalTimerSnapshotStore: IntervalTimerSnapshotStore;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		this.keyValueStore = new KeyValueStore(manifest.id);
		this.intervalTimerSnapshotStore = new IntervalTimerSnapshotStore(
			this.keyValueStore,
		);
		this.statusBar = new StatusBar(this.addStatusBarItem(), this.app);
	}

	public override async onload(): Promise<void> {
		await this.loadSettings();
		this.setupIntervalTimer();
		this.addCommands();
		this.addSettingTab(new SettingTab(this.app, this));

		this.statusBar.enableClick(this.intervalTimer);
	}

	public override onunload(): void {
		FlashOverlay.dispose();
		this.intervalTimer.dispose();
	}

	public async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private setupIntervalTimer(): void {
		const onChangeState: onChangeStateFunction = (
			_timerState,
			intervalTimerState,
			time,
			intervals,
		) => {
			this.intervalTimerSnapshotStore.save(
				intervalTimerState,
				time,
				intervals,
			);
			this.statusBar.update(intervals, time, intervalTimerState);
		};
		const notifier = (message: string, context: NotifierContext) => {
			const overlayColor = match(context.state)
				.with("focus", () => ({ r: 255, g: 100, b: 100 }))
				.with("shortBreak", "longBreak", () => ({
					r: 100,
					g: 255,
					b: 100,
				}))
				.exhaustive();
			FlashOverlay.getInstance().show(overlayColor);
			notify(this.settings.notificationStyle, message);
		};
		const snapshot = this.intervalTimerSnapshotStore.load();

		this.intervalTimer = new IntervalTimer(
			onChangeState,
			this.settings,
			notifier,
		);
		if (snapshot !== null) {
			this.intervalTimer.applySnapshot(snapshot);
		}
		this.intervalTimer.enableAutoReset();
	}

	private addCommands(): void {
		this.addCommand({
			id: "start-timer",
			name: "Start timer",
			callback: () => this.intervalTimer.start(),
		});
		this.addCommand({
			id: "pause-timer",
			name: "Pause timer",
			callback: () => this.intervalTimer.pause(),
		});
		this.addCommand({
			id: "reset-timer",
			name: "Reset timer",
			callback: () => this.intervalTimer.reset(),
		});
		this.addCommand({
			id: "reset-intervals-set",
			name: "Reset intervals set",
			callback: () => this.intervalTimer.resetIntervalsSet(),
		});
		this.addCommand({
			id: "reset-total-intervals",
			name: "Reset total intervals",
			callback: () => this.intervalTimer.resetTotalIntervals(),
		});
		this.addCommand({
			id: "skip-interval", // TODO: only show this command when the timer type is break
			name: "Skip interval",
			callback: () => this.intervalTimer.skipInterval(),
		});
	}

	private async loadSettings(): Promise<void> {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	}
}
