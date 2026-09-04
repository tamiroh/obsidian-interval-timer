import { describe, expect, it, vi } from "vitest";
import { IntervalTimerHost } from "./obsidian-interval-timer-host";
import {
	defaultPluginSetting,
	PluginSettingStore,
} from "./obsidian-plugin-setting";
import type { IntervalTimerSnapshotStore } from "./interval-timer-snapshot";
import type { TaskLineController } from "./obsidian-task-line-controller";
import type { TimerDisplay } from "./timer-display";
import * as t from "./time";

describe("IntervalTimerHost", () => {
	it("persists the active duration when duration settings change", () => {
		// Arrange
		const settingStore = new PluginSettingStore(defaultPluginSetting);
		const save = vi.fn();
		const host = new IntervalTimerHost({
			settingStore,
			timerDisplay: {
				update: vi.fn(),
				updateTrackedTask: vi.fn(),
				updateLongBreakAfter: vi.fn(),
				enableClick: vi.fn(),
				dispose: vi.fn(),
			} satisfies TimerDisplay,
			snapshotStore: {
				load: () => null,
				save,
			} as unknown as IntervalTimerSnapshotStore,
			taskLineController: {
				untrackCurrentTask: vi.fn(),
			} as unknown as TaskLineController,
		});
		host.initialize();
		save.mockClear();

		// Act
		settingStore.update({ focusIntervalDuration: 30 });

		// Assert
		expect(save).toHaveBeenCalledWith({
			...t.time(25, 0),
			state: "focus",
			intervalDuration: t.time(25, 0),
			focusIntervals: { total: 0, set: 0 },
		});

		host.dispose();
	});
});
