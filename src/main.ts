import { Plugin as BasePlugin } from "obsidian";
import { SettingTab } from "./setting/settingTab";
import { Setting } from "./setting/types";
import { DEFAULT_SETTINGS } from "./setting/default";
import { IntervalTimerManager } from "./manager/intervalTimerManager";
import { format } from "./utils/time";
import { onChangeStateFunction } from "./manager/types";
import { BasicTaskLine } from "./taskLine/basicTaskLine";

export default class Plugin extends BasePlugin {
	public settings!: Setting;

	private statusBarItem!: HTMLElement;

	private intervalTimerManager!: IntervalTimerManager;

	private onCompleteHook?: () => void;

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
			intervals
		) => {
			this.statusBarItem.setText(
				`${intervals.set}/${intervals.total} ${format(time)}`
			);
			this.statusBarItem.setAttribute(
				"style",
				intervalTimerState === "focus"
					? "color: #EE6152"
					: "color: #4CBD4F"
			);
		};
		const onIntervalCreated = (intervalId: number) =>
			this.registerInterval(intervalId);

		this.intervalTimerManager = new IntervalTimerManager(
			onChangeState,
			this.settings,
			onIntervalCreated,
			{
				onComplete: () => {
					this.onCompleteHook?.();
				},
			}
		);
	};

	private addCommands = () => {
		this.addCommand({
			id: "start-timer",
			name: "Start timer",
			callback: this.intervalTimerManager.startTimer,
			editorCallback: (editor) => {
				this.intervalTimerManager.startTimer();

				const { line } = editor.getCursor();
				const cursorLine = editor.getLine(line);
				const currentTaskLine = new BasicTaskLine(cursorLine);

				this.onCompleteHook = () => {
					editor.replaceRange(
						currentTaskLine.increase().toString(),
						{ line, ch: 0 },
						{ line, ch: cursorLine.length }
					);
				};
			},
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
