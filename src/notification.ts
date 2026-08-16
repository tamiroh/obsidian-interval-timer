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
		const notification = new Notification(message, {
			body: "Interval Timer",
		});
		this.current = notification;
		notification.addEventListener(
			"close",
			() => {
				if (this.current === notification) {
					this.current = null;
				}
			},
			{ once: true },
		);
	}

	override clearNotification(): void {
		this.current?.close();
		this.current = null;
	}
}
