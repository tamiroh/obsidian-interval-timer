/* eslint-disable import/no-extraneous-dependencies */

import { type Extension, RangeSetBuilder } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { TaskLine } from "./task-line";
import { TaskTracker } from "./task-tracker";

const taskLineHighlightDecoration = Decoration.line({
	class: "interval-timer-task-line-highlight",
});

const startTaskButtonDecoration = Decoration.widget({
	side: 1,
	widget: new (class extends WidgetType {
		toDOM(): HTMLElement {
			const link = document.createElement("a");
			link.href = "#";
			link.className = "interval-timer-start-task-button";
			link.textContent = "Start task";
			link.addEventListener("mousedown", (event) => {
				event.preventDefault();
			});
			return link;
		}
	})(),
});

const buildDecorations = (
	view: EditorView,
	trackedTaskName: string | null,
	isHighlightEnabled: boolean,
): DecorationSet => {
	const builder = new RangeSetBuilder<Decoration>();

	if (!isHighlightEnabled) {
		return builder.finish();
	}

	if (trackedTaskName) {
		for (
			let lineNumber = 1;
			lineNumber <= view.state.doc.lines;
			lineNumber += 1
		) {
			const line = view.state.doc.line(lineNumber);
			const taskLine = TaskLine.from(line.text);
			if (taskLine?.taskName === trackedTaskName) {
				builder.add(line.from, line.from, taskLineHighlightDecoration);
				return builder.finish();
			}
		}
		return builder.finish();
	}

	const line = view.state.doc.lineAt(view.state.selection.main.head);
	if (TaskLine.from(line.text) !== null) {
		builder.add(line.from, line.from, taskLineHighlightDecoration);
		builder.add(line.to, line.to, startTaskButtonDecoration);
	}

	return builder.finish();
};

export class TaskLineHighlighter {
	private readonly taskTracker: TaskTracker;

	private readonly isHighlightEnabled: () => boolean;

	constructor(taskTracker: TaskTracker, isHighlightEnabled: () => boolean) {
		this.taskTracker = taskTracker;
		this.isHighlightEnabled = isHighlightEnabled;
	}

	public createExtension(): Extension {
		const getTrackedTaskName = this.taskTracker.getTrackedTaskName.bind(
			this.taskTracker,
		);
		const isHighlightEnabled = this.isHighlightEnabled.bind(this);

		return ViewPlugin.fromClass(
			class {
				public decorations: DecorationSet;

				constructor(view: EditorView) {
					this.decorations = buildDecorations(
						view,
						getTrackedTaskName(),
						isHighlightEnabled(),
					);
				}

				update(update: ViewUpdate): void {
					this.decorations = buildDecorations(
						update.view,
						getTrackedTaskName(),
						isHighlightEnabled(),
					);
				}
			},
			{
				decorations: (value) => value.decorations,
			},
		);
	}
}
