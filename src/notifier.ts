import { match } from "ts-pattern";
import { Notice } from "obsidian";

export type NotificationStyle = "system" | "simple";

export abstract class Notifier {
	abstract notify(message: string): void;
	clearNotification(): void {}
}

export class SystemNotifier extends Notifier {
	private current: Notification | null = null;

	override notify(message: string): void {
		if (document.hasFocus()) return;
		this.clearNotification();
		this.current = new Notification(message, { body: "Interval Timer" });
		this.current.addEventListener(
			"close",
			() => {
				this.current = null;
			},
			{ once: true },
		);
	}

	override clearNotification(): void {
		this.current?.close();
		this.current = null;
	}
}

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
