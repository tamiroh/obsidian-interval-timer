import {
	App,
	Notice,
	Platform,
	Plugin as BasePlugin,
	PluginManifest,
	setIcon,
} from "obsidian";
import { SettingTab } from "./obsidian-setting-tab";
import { StatusBar } from "./status-bar";
import { FloatingTimer } from "./obsidian-floating-timer";
import { KeyValueStore } from "./key-value-store";
import { IntervalTimerSnapshotStore } from "./interval-timer-snapshot";
import { TaskTracker } from "./obsidian-task-tracker";
import { TaskLineController } from "./obsidian-task-line-controller";
import {
	defaultPluginSetting,
	PluginSetting,
	type PluginSettingUpdateResult,
	PluginSettingStore,
} from "./obsidian-plugin-setting";
import { IntervalTimerHost } from "./obsidian-interval-timer-host";
import type { TimerDisplay } from "./timer-display";

export type { PluginSetting } from "./obsidian-plugin-setting";

export class Plugin extends BasePlugin {
	private readonly settingStore: PluginSettingStore = new PluginSettingStore(
		defaultPluginSetting,
	);

	public get currentSettings(): Readonly<PluginSetting> {
		return this.settingStore.state;
	}

	private timerDisplay: TimerDisplay;

	private intervalTimerHost!: IntervalTimerHost;

	private keyValueStore: KeyValueStore;

	private intervalTimerSnapshotStore: IntervalTimerSnapshotStore;

	private readonly taskLineController: TaskLineController;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		this.keyValueStore = new KeyValueStore(manifest.id);
		this.intervalTimerSnapshotStore = new IntervalTimerSnapshotStore(
			this.keyValueStore,
		);
		const callbacks = {
			notify: (message: string) => new Notice(message),
			renderIcon: setIcon,
		};
		this.timerDisplay = Platform.isMobile
			? new FloatingTimer(this.app, callbacks)
			: new StatusBar(this.addStatusBarItem(), callbacks);
		this.taskLineController = new TaskLineController(
			this.app.workspace,
			new TaskTracker(this.app, this.keyValueStore),
			this.timerDisplay,
		);
	}

	public override async onload(): Promise<void> {
		this.settingStore.loadFromUnknown(await this.loadData());
		this.intervalTimerHost = new IntervalTimerHost({
			settings: this.currentSettings,
			timerDisplay: this.timerDisplay,
			snapshotStore: this.intervalTimerSnapshotStore,
			taskLineController: this.taskLineController,
		});
		this.intervalTimerHost.initialize();
		this.settingStore.subscribe((previous, next) => {
			this.intervalTimerHost.applySettings(previous, next);
			void this.saveData(next);
		});
		this.taskLineController.setup(this, this.intervalTimerHost.timer);
		this.registerCommands();
		this.addSettingTab(new SettingTab(this.app, this));

		this.timerDisplay.enableClick(this.intervalTimerHost.timer);
		this.registerDomEvent(window, "focus", () => {
			this.intervalTimerHost.clearNotification();
		});
	}

	public override onunload(): void {
		this.intervalTimerHost.dispose();
	}

	public updateSetting(
		key: keyof PluginSetting,
		value: unknown,
	): PluginSettingUpdateResult {
		return this.settingStore.updateFromUnknown(key, value);
	}

	private registerCommands(): void {
		const intervalTimer = this.intervalTimerHost.timer;
		this.addCommand({
			id: "start-timer",
			name: "Start timer",
			checkCallback: (checking) => {
				const canStart = intervalTimer.canStart;
				if (!checking && canStart) {
					intervalTimer.start();
				}
				return canStart;
			},
		});
		this.addCommand({
			id: "pause-timer",
			name: "Pause timer",
			checkCallback: (checking) => {
				const canPause = intervalTimer.canPause;
				if (!checking && canPause) {
					intervalTimer.pause();
				}
				return canPause;
			},
		});
		this.addCommand({
			id: "reset-timer",
			name: "Reset timer",
			callback: () => {
				intervalTimer.reset();
			},
		});
		this.addCommand({
			id: "reset-intervals-set",
			name: "Reset intervals set",
			callback: () => {
				intervalTimer.resetIntervalsSet();
			},
		});
		this.addCommand({
			id: "reset-total-intervals",
			name: "Reset total intervals",
			callback: () => {
				intervalTimer.resetTotalIntervals();
			},
		});
		this.addCommand({
			id: "skip-interval",
			name: "Skip interval",
			checkCallback: (checking) => {
				const canSkip = intervalTimer.state !== "focus";
				if (!checking && canSkip) {
					intervalTimer.skipInterval();
				}
				return canSkip;
			},
		});
	}
}
