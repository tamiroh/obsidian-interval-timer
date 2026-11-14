import {
	type App,
	Notice,
	Menu,
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
import { IntervalTimerEventRecord } from "./interval-timer-event-record";
import { EventStore } from "./event-store";
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

	private readonly intervalTimerEventStore;

	private readonly taskTracker;

	private readonly taskLineController;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		this.settingStore = new PluginSettingStore(defaultPluginSetting);
		this.keyValueStore = new KeyValueStore(manifest.id);
		this.intervalTimerSnapshotStore = new IntervalTimerSnapshotStore(
			this.keyValueStore,
		);
		this.intervalTimerEventStore = new EventStore({
			fileSystem: this.app.vault.adapter,
			directory: `${manifest.dir ?? `${this.app.vault.configDir}/plugins/${manifest.id}`}/events`,
			parse: (value) => IntervalTimerEventRecord.parse(value),
			onError: (error) => {
				console.error(
					"Interval Timer: failed to access timer events.",
					error,
				);
				new Notice("Failed to access timer events.");
			},
		});
		this.taskTracker = new TaskTracker(this.app, this.keyValueStore);
		const callbacks = {
			notify: (message: string) => new Notice(message),
			renderIcon: setIcon,
			showOptionsMenu: (
				element: HTMLElement,
				reset: () => void,
				totalIntervals: number,
			) => {
				const bounds = element.getBoundingClientRect();
				new Menu()
					.addItem((item) =>
						item
							.setTitle(`Total intervals: ${totalIntervals}`)
							.setDisabled(true),
					)
					.addItem((item) =>
						item.setTitle("Reset set").onClick(reset),
					)
					.showAtPosition(
						{ x: bounds.left, y: bounds.bottom },
						element.ownerDocument,
					);
			},
		};
		this.timerDisplay = Platform.isMobile
			? new FloatingTimer(this.app, callbacks)
			: new StatusBar(this.addStatusBarItem(), callbacks);
		this.taskLineController = new TaskLineController(
			this.app.workspace,
			this.taskTracker,
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
			eventStore: this.intervalTimerEventStore,
			taskLineController: this.taskLineController,
		});
		this.intervalTimerHost = intervalTimerHost;
		this.timerDisplay.enableClick(intervalTimerHost.timer);
		intervalTimerHost.initialize();

		// Register timer integrations
		this.taskLineController.setup(this, intervalTimerHost.timer);
		registerCommands(
			this,
			intervalTimerHost.timer,
			this.taskTracker,
			this.intervalTimerEventStore,
		);

		// Persist settings changes
		this.settingStore.subscribe((_previous, next) => {
			this.saveData(next).catch((error: unknown) => {
				console.error(
					"Interval Timer: failed to save settings.",
					error,
				);
			});
		});

		// Register the setting tab
		this.addSettingTab(new SettingTab(this.app, this, this.settingStore));
	}

	public override onunload(): void {
		this.intervalTimerHost?.dispose();
		this.timerDisplay.dispose();
	}
}
