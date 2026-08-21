import {
	type App,
	Notice,
	Platform,
	Plugin as BasePlugin,
	type PluginManifest,
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
	PluginSettingStore,
} from "./obsidian-plugin-setting";
import { IntervalTimerHost } from "./obsidian-interval-timer-host";
import { registerCommands } from "./obsidian-plugin-commands";

export class Plugin extends BasePlugin {
	private readonly settingStore;

	private readonly timerDisplay;

	private intervalTimerHost: IntervalTimerHost | undefined;

	private readonly keyValueStore;

	private readonly intervalTimerSnapshotStore;

	private readonly taskLineController;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		this.settingStore = new PluginSettingStore(defaultPluginSetting);
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
		// Load settings
		this.settingStore.loadFromUnknown(await this.loadData());

		// Initialize the timer host
		const intervalTimerHost = new IntervalTimerHost({
			settingStore: this.settingStore,
			timerDisplay: this.timerDisplay,
			snapshotStore: this.intervalTimerSnapshotStore,
			taskLineController: this.taskLineController,
		});
		this.intervalTimerHost = intervalTimerHost;
		intervalTimerHost.initialize();

		// Register timer integrations
		this.taskLineController.setup(this, intervalTimerHost.timer);
		registerCommands(this, intervalTimerHost.timer);
		this.timerDisplay.enableClick(intervalTimerHost.timer);

		// Persist settings changes
		this.settingStore.subscribe(
			(_previous, next) => void this.saveData(next),
		);

		// Register the setting tab
		this.addSettingTab(new SettingTab(this.app, this, this.settingStore));
	}

	public override onunload(): void {
		this.intervalTimerHost?.dispose();
		this.timerDisplay.dispose();
	}
}
