import { match } from "ts-pattern";
import { Notice } from "obsidian";
import {
	Notifier,
	SystemNotifier,
	type NotificationStyle,
} from "./notification";

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
