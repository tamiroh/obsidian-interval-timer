import { AudioOutput, type Sound } from "./audio-output";

const tickDurationSeconds = 0.032;

const secondaryImpactDelaySeconds = 0.006;

const maxGain = 0.1;

export class FocusTickSound {
	private readonly audioOutput: AudioOutput;

	constructor(audioOutput: AudioOutput) {
		this.audioOutput = audioOutput;
	}

	public play(volume: number): void {
		if (volume <= 0) return;

		this.audioOutput.play(tickSound, {
			gain: maxGain * Math.min(volume / 100, 1),
		});
	}
}

const createTickSamples = (sampleRate: number): Float32Array => {
	const frameCount = Math.ceil(sampleRate * tickDurationSeconds);
	const samples = new Float32Array(frameCount);

	for (let frame = 0; frame < frameCount; frame += 1) {
		const elapsedSeconds = frame / sampleRate;
		const noise = Math.random() * 2 - 1;
		const primaryImpact = noise * Math.exp(-elapsedSeconds * 850) * 0.8;
		const woodenBody =
			Math.sin(2 * Math.PI * 720 * elapsedSeconds) *
			Math.exp(-elapsedSeconds * 180) *
			0.32;
		const metalMechanism =
			Math.sin(2 * Math.PI * 2_600 * elapsedSeconds) *
			Math.exp(-elapsedSeconds * 240) *
			0.22;
		const secondaryImpact = createSecondaryImpact(elapsedSeconds, noise);
		const endFade = Math.min(
			1,
			(tickDurationSeconds - elapsedSeconds) / 0.003,
		);

		samples[frame] =
			Math.tanh(
				(primaryImpact +
					woodenBody +
					metalMechanism +
					secondaryImpact) *
					1.2,
			) * endFade;
	}

	return samples;
};

const createSecondaryImpact = (
	elapsedSeconds: number,
	noise: number,
): number => {
	if (elapsedSeconds < secondaryImpactDelaySeconds) return 0;

	const impactTime = elapsedSeconds - secondaryImpactDelaySeconds;
	const envelope = Math.exp(-impactTime * 600);
	return (
		envelope *
		(noise * 0.28 + Math.sin(2 * Math.PI * 1_900 * impactTime) * 0.18)
	);
};

const tickSound: Sound = { createSamples: createTickSamples };
