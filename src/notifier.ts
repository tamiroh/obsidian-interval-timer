import { match } from "ts-pattern";
import { Notice } from "obsidian";

const electron = window.require?.("electron");

export type NotificationStyle = "system" | "simple";

export const notify = (style: NotificationStyle, message: string) =>
	match(style)
		.with("system", () => {
			new electron.remote.Notification({
				title: message,
				body: "Interval Timer",
			}).show();
		})
		.with("simple", () => {
			new Notice(message);
		})
		.exhaustive();
