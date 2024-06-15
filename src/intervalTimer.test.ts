import { describe, expect, it, vi } from "vitest";
import { IntervalTimer, IntervalTimerSetting } from "./intervalTimer";

describe("IntervalTimer", () => {
	it("should call handleIntervalCreated when started", () => {
		const handleChangeState = vi.fn();
		const settings: IntervalTimerSetting = {
			focusIntervalDuration: 25,
			shortBreakDuration: 5,
			longBreakDuration: 15,
			longBreakAfter: 4,
			notificationStyle: "simple",
		};
		const handleIntervalCreated = vi.fn();
		const notifier = vi.fn();
		const intervalTimer = new IntervalTimer(
			handleChangeState,
			settings,
			handleIntervalCreated,
			notifier,
		);

		intervalTimer.start();
		expect(handleIntervalCreated).toHaveBeenCalledTimes(1);
	});
});
