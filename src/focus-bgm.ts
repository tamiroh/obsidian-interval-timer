import {
	AudioOutput,
	GeneratedSound,
	type Playback,
	type Sound,
} from "./audio-output";

//
// Player
//

const fadeSeconds = 0.15;

const previewDurationMilliseconds = 3_000;

type PlayingBgm = {
	type: PlayableFocusBgmType;
	volume: number;
	maxGain: number;
	playback: Playback;
};

export class FocusBgm {
	private readonly audioOutput: AudioOutput;

	private playing: PlayingBgm | undefined;

	private previewTimeoutId: number | undefined;

	constructor(audioOutput: AudioOutput) {
		this.audioOutput = audioOutput;
	}

	public play(type: FocusBgmType, volume: number): void {
		this.clearPreviewTimeout();

		if (type === "none" || volume <= 0) {
			this.stopPlaying();
			return;
		}

		const playing = this.playing;
		if (playing !== undefined && playing.type === type) {
			if (playing.volume === volume) return;

			playing.volume = volume;
			playing.playback.setGain(
				FocusBgm.toGain(playing.maxGain, volume),
				fadeSeconds,
			);
			return;
		}

		this.stopPlaying();
		this.playing = this.startPlaying(type, volume);
	}

	public preview(type: FocusBgmType, volume: number): void {
		this.play(type, volume);
		if (this.playing === undefined) return;

		this.previewTimeoutId = window.setTimeout(
			() => this.stop(),
			previewDurationMilliseconds,
		);
	}

	public stop(): void {
		this.clearPreviewTimeout();
		this.stopPlaying();
	}

	public dispose(): void {
		this.clearPreviewTimeout();
		this.stopPlayingImmediately();
	}

	private startPlaying(
		type: PlayableFocusBgmType,
		volume: number,
	): PlayingBgm | undefined {
		const source = focusBgmSources[type];
		const playback = this.audioOutput.play(source.sound, {
			mode: "loop",
			gain: FocusBgm.toGain(source.maxGain, volume),
			fadeSeconds,
		});
		if (playback === undefined) return undefined;

		return { type, volume, maxGain: source.maxGain, playback };
	}

	private stopPlaying(): void {
		const playing = this.playing;
		if (playing === undefined) return;

		this.playing = undefined;
		playing.playback.stop(fadeSeconds);
	}

	private stopPlayingImmediately(): void {
		const playing = this.playing;
		if (playing === undefined) return;

		this.playing = undefined;
		playing.playback.stop(0);
	}

	private clearPreviewTimeout(): void {
		if (this.previewTimeoutId === undefined) return;

		window.clearTimeout(this.previewTimeoutId);
		this.previewTimeoutId = undefined;
	}

	private static toGain(maxGain: number, volume: number): number {
		return maxGain * Math.min(volume / 100, 1);
	}
}

//
// Sources
//

export const focusBgmTypes = ["none", "whiteNoise"] as const;

export type FocusBgmType = (typeof focusBgmTypes)[number];

type PlayableFocusBgmType = Exclude<FocusBgmType, "none">;

type FocusBgmSource = {
	maxGain: number;
	sound: Sound;
};

const whiteNoiseDurationSeconds = 2;

const focusBgmSources: Record<PlayableFocusBgmType, FocusBgmSource> = {
	whiteNoise: {
		maxGain: 0.22,
		sound: new GeneratedSound((sampleRate) => {
			const lowpassFrequency = 900;
			const noise = new Float32Array(
				Math.ceil(sampleRate * whiteNoiseDurationSeconds),
			);
			const samples = new Float32Array(noise.length);
			const smoothing =
				1 - Math.exp((-2 * Math.PI * lowpassFrequency) / sampleRate);
			let firstStage = 0;
			let secondStage = 0;

			for (let frame = 0; frame < noise.length; frame += 1) {
				noise[frame] = Math.random() * 2 - 1;
			}
			for (let pass = 0; pass < 2; pass += 1) {
				for (let frame = 0; frame < noise.length; frame += 1) {
					firstStage +=
						smoothing * ((noise[frame] ?? 0) - firstStage);
					secondStage += smoothing * (firstStage - secondStage);
					samples[frame] = secondStage;
				}
			}

			return samples;
		}),
	},
};
