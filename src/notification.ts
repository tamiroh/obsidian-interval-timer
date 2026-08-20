export const notificationStyles = ["system", "simple"] as const;

export type NotificationStyle = (typeof notificationStyles)[number];

export abstract class Notifier {
	abstract notify(message: string): void;
	enableAutoClear(): void {}
	dispose(): void {}
}

export class SystemNotifier extends Notifier {
	private current: Notification | null = null;

	private readonly handleWindowFocus = () => {
		this.clearNotification();
	};

	override enableAutoClear(): void {
		window.addEventListener("focus", this.handleWindowFocus);
	}

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

	override dispose(): void {
		window.removeEventListener("focus", this.handleWindowFocus);
		this.clearNotification();
	}

	private clearNotification(): void {
		this.current?.close();
		this.current = null;
	}
}
