import { match } from "ts-pattern";
import { Notice } from "obsidian";
import { Notifier, SystemNotifier } from "./notification";

export const notificationStyles = ["system", "simple"] as const;

export type NotificationStyle = (typeof notificationStyles)[number];

export class SimpleNotifier extends Notifier {
	override notify(message: string): void {
		new Notice(message);
	}
}

export const createNotifier = (style: NotificationStyle): Notifier =>
	match(style)
		.with("system", () => new SystemNotifier())
		.with("simple", () => new SimpleNotifier())
		.exhaustive();
