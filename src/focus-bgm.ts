import { AudioOutput, type AudioChannel, type Sound } from "./audio-output";

//
// Types
//

export const focusBgmTypes = ["none", "whiteNoise"] as const;

export type FocusBgmType = (typeof focusBgmTypes)[number];

type PlayableFocusBgmType = Exclude<FocusBgmType, "none">;

type FocusBgmSource = {
	maxGain: number;
	sound: Sound;
};

type PlayingBgm = {
	type: PlayableFocusBgmType;
	volume: number;
	maxGain: number;
	channel: AudioChannel;
};

//
// Player
//

const fadeSeconds = 0.15;

const previewDurationMilliseconds = 3_000;

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
			playing.channel.setGain(
				toGain(playing.maxGain, volume),
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
		this.stop();
	}

	private startPlaying(
		type: PlayableFocusBgmType,
		volume: number,
	): PlayingBgm | undefined {
		const source = focusBgmSources[type];
		const channel = this.audioOutput.play(source.sound, {
			gain: toGain(source.maxGain, volume),
			fadeSeconds,
		});
		if (channel === undefined) return undefined;

		return { type, volume, maxGain: source.maxGain, channel };
	}

	private stopPlaying(): void {
		const playing = this.playing;
		if (playing === undefined) return;

		this.playing = undefined;
		playing.channel.stop(fadeSeconds);
	}

	private clearPreviewTimeout(): void {
		if (this.previewTimeoutId === undefined) return;

		window.clearTimeout(this.previewTimeoutId);
		this.previewTimeoutId = undefined;
	}
}

const toGain = (maxGain: number, volume: number): number =>
	maxGain * Math.min(volume / 100, 1);

//
// Sources
//

const whiteNoiseDurationSeconds = 2;

const focusBgmSources: Record<PlayableFocusBgmType, FocusBgmSource> = {
	whiteNoise: {
		maxGain: 0.22,
		sound: {
			createSamples: (sampleRate) => {
				const samples = new Float32Array(
					Math.ceil(sampleRate * whiteNoiseDurationSeconds),
				);

				for (let frame = 0; frame < samples.length; frame += 1) {
					samples[frame] = Math.random() * 2 - 1;
				}

				return samples;
			},
			loop: true,
			lowpass: { frequency: 900, q: 0.5 },
		},
	},
};
