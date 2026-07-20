// eslint-disable-next-line import/no-extraneous-dependencies -- provided by obsidian
import { type Extension, RangeSetBuilder } from "@codemirror/state";
// eslint-disable-next-line import/no-extraneous-dependencies -- provided by obsidian
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
import { Markdown } from "./markdown";

const createTaskLineHighlightDecoration = (isTracking: boolean): Decoration =>
	Decoration.line({
		class: isTracking
			? "interval-timer-task-line-highlight interval-timer-task-line-highlight-tracking"
			: "interval-timer-task-line-highlight",
	});

const startTaskButtonDecoration = Decoration.widget({
	side: 1,
	widget: new (class extends WidgetType {
		toDOM(): HTMLElement {
			const link = createEl("a");
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

	const taskLineHighlightDecoration = createTaskLineHighlightDecoration(
		trackedTaskName !== null,
	);
	const markdown = new Markdown(view.state.doc.toString());

	if (trackedTaskName) {
		for (
			let lineNumber = 1;
			lineNumber <= view.state.doc.lines;
			lineNumber += 1
		) {
			const line = view.state.doc.line(lineNumber);
			const taskLine = TaskLine.from(line.text);
			if (
				taskLine?.taskName === trackedTaskName &&
				!markdown.isLineInCodeBlock(lineNumber)
			) {
				builder.add(line.from, line.from, taskLineHighlightDecoration);
				return builder.finish();
			}
		}
		return builder.finish();
	}

	const line = view.state.doc.lineAt(view.state.selection.main.head);
	if (
		TaskLine.from(line.text) !== null &&
		!markdown.isLineInCodeBlock(line.number)
	) {
		builder.add(line.from, line.from, taskLineHighlightDecoration);
		builder.add(line.to, line.to, startTaskButtonDecoration);
	}

	return builder.finish();
};

export class TaskLineHighlighter {
	private readonly taskTracker: TaskTracker;

	private readonly isHighlightEnabled: () => boolean;

	private readonly onEditorUpdate: () => void;

	constructor(
		taskTracker: TaskTracker,
		isHighlightEnabled: () => boolean,
		onEditorUpdate: () => void,
	) {
		this.taskTracker = taskTracker;
		this.isHighlightEnabled = isHighlightEnabled;
		this.onEditorUpdate = onEditorUpdate;
	}

	public createExtension(): Extension {
		const getTrackedTaskName = this.taskTracker.getTrackedTaskName.bind(
			this.taskTracker,
		);
		const isHighlightEnabled = this.isHighlightEnabled.bind(this);
		const onEditorUpdate = this.onEditorUpdate.bind(this);

		return ViewPlugin.fromClass(
			class {
				public decorations: DecorationSet;

				constructor(view: EditorView) {
					this.decorations = buildDecorations(
						view,
						getTrackedTaskName(),
						isHighlightEnabled(),
					);
					onEditorUpdate();
				}

				update(update: ViewUpdate): void {
					this.decorations = buildDecorations(
						update.view,
						getTrackedTaskName(),
						isHighlightEnabled(),
					);
					if (update.selectionSet || update.docChanged) {
						onEditorUpdate();
					}
				}
			},
			{
				decorations: (value) => value.decorations,
			},
		);
	}
}
