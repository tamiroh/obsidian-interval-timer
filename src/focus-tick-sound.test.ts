import { afterEach, describe, expect, it, vi } from "vitest";
import { FocusTickSound } from "./focus-tick-sound";
import { AudioOutput } from "./audio-output";

describe("FocusTickSound", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("does not initialize Web Audio when muted", () => {
		const AudioContextMock = vi.fn();
		vi.stubGlobal("AudioContext", AudioContextMock);

		new FocusTickSound(new AudioOutput()).play(0);

		expect(AudioContextMock).not.toHaveBeenCalled();
	});

	it("does nothing when Web Audio is unavailable", () => {
		vi.stubGlobal("AudioContext", undefined);

		expect(() => {
			new FocusTickSound(new AudioOutput()).play(50);
		}).not.toThrow();
	});

	it("does not interrupt the timer when audio initialization fails", () => {
		vi.stubGlobal(
			"AudioContext",
			vi.fn(function () {
				throw new Error("Audio is unavailable");
			}),
		);

		expect(() => {
			new FocusTickSound(new AudioOutput()).play(50);
		}).not.toThrow();
	});
});
