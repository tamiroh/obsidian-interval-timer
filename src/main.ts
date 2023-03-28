import { Notice, Plugin as BasePlugin } from "obsidian";
import { SettingTab } from "./setting/settingTab";
import { Setting } from "./setting/types";
import { DEFAULT_SETTINGS } from "./setting/default";
import { CountdownTimer } from "./timer/countdownTimer";
import { Time } from "./time/time";
import { format } from "./utils/time";

export default class Plugin extends BasePlugin {
	public settings: Setting;

	private statusBarItem: HTMLElement;

	private timerState: { type: "focus" | "break"; timer: CountdownTimer };

	public override onload = async () => {
		await this.loadSettings();
		this.initializeStatusBar();
		this.addCommands();
		this.addSettingTab(new SettingTab(this.app, this));
	};

	public saveSettings = async () => {
		await this.saveData(this.settings);
	};

	private initializeStatusBar = () => {
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText(
			`(Initialized) ${format(
				new Time(this.settings.focusIntervalDuration, 0)
			)}`
		);
	};

	private addCommands = () => {
		this.addCommand({
			id: "start-timer",
			name: "Start timer",
			callback: this.startTimer,
		});
		this.addCommand({
			id: "pause-timer",
			name: "Pause timer",
			callback: () => this.timerState.timer.pause(),
		});
		this.addCommand({
			id: "reset-timer",
			name: "Reset timer",
			callback: this.resetTimer,
		});
	};

	private loadSettings = async () => {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	};

	private startTimer = () => {
		if (this.timerState == null) {
			const startTime = new Time(this.settings.focusIntervalDuration, 0);
			const timer = new CountdownTimer(
				startTime,
				(time: Time) =>
					this.statusBarItem.setText(`(Running) ${format(time)}`),
				this.onPause,
				this.onComplete
			);
			this.timerState = { type: "focus", timer };
		}
		this.statusBarItem.setText(
			`(Running) ${format(
				new Time(this.settings.focusIntervalDuration, 0)
			)}`
		);
		this.timerState.timer.start();
		const intervalId = this.timerState.timer.getIntervalId();
		if (intervalId != null) {
			this.registerInterval(intervalId);
		}
	};

	private onComplete = () => {
		new Notice("completed!");
		this.statusBarItem.setText(`(Completed) 00:00`);
	};

	private onPause = (current: Time) => {
		this.statusBarItem.setText(`(Paused) ${format(current)}`);
	};

	private resetTimer = () => {
		const result = this.timerState.timer.reset();
		if (result.type === "succeeded") {
			this.statusBarItem.setText(
				`(Initialized) ${format(result.resetTo)}`
			);
		}
	};
}
