import { match } from "ts-pattern";
import electron from "electron";
import { Notice } from "obsidian";

export type NotificationStyle = "system" | "simple";

export const notify = (style: NotificationStyle, message: string) =>
	match(style)
		.with("system", () => {
			new (electron as any).remote.Notification({
				title: message,
				body: "Interval Timer",
			}).show();
		})
		.with("simple", () => {
			new Notice(message);
		})
		.exhaustive();
