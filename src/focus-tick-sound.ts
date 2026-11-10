import { type AudioOutput, GeneratedSound } from "./audio-output";

type Impact = {
	atSeconds: number;
	strength: number;
};

type Mode = {
	frequencyHz: number;
	decaySeconds: number;
	gain: number;
};

const tickDurationSeconds = 0.045;

const impactDecaySeconds = 0.00025;

const directClickGain = 0.2;

const endFadeSeconds = 0.008;

const peakLevel = 0.9;

const variantCount = 4;

const gainVariation = 0.06;

const maxGain = 0.1;

const impacts: readonly Impact[] = [
	{ atSeconds: 0, strength: 1 },
	{ atSeconds: 0.0055, strength: 0.22 },
];

const modes: readonly Mode[] = [
	{ frequencyHz: 900, decaySeconds: 0.006, gain: 0.25 },
	{ frequencyHz: 1_900, decaySeconds: 0.005, gain: 0.5 },
	{ frequencyHz: 3_100, decaySeconds: 0.004, gain: 1 },
	{ frequencyHz: 4_600, decaySeconds: 0.003, gain: 0.8 },
	{ frequencyHz: 6_500, decaySeconds: 0.002, gain: 0.5 },
	{ frequencyHz: 9_000, decaySeconds: 0.0015, gain: 0.3 },
];

export class FocusTickSound {
	private readonly audioOutput: AudioOutput;

	constructor(audioOutput: AudioOutput) {
		this.audioOutput = audioOutput;
	}

	public play(volume: number): void {
		if (volume <= 0) return;

		const sound = tickSounds[Math.floor(Math.random() * tickSounds.length)];
		if (sound === undefined) return;

		this.audioOutput.play(sound, {
			mode: "once",
			gain: maxGain * Math.min(volume / 100, 1) * vary(1, gainVariation),
		});
	}
}

const vary = (value: number, ratio: number): number =>
	value * (1 + (Math.random() * 2 - 1) * ratio);

const createExcitation = (
	frameCount: number,
	sampleRate: number,
): Float32Array => {
	const excitation = new Float32Array(frameCount);
	const burstFrameCount = Math.ceil(impactDecaySeconds * 8 * sampleRate);

	for (const impact of impacts) {
		const startFrame = Math.round(
			vary(impact.atSeconds, 0.08) * sampleRate,
		);
		const strength = vary(impact.strength, 0.1);

		for (let offset = 0; offset < burstFrameCount; offset += 1) {
			const frame = startFrame + offset;
			if (frame >= frameCount) break;

			excitation[frame] =
				(excitation[frame] ?? 0) +
				strength *
					(Math.random() * 2 - 1) *
					Math.exp(-offset / (impactDecaySeconds * sampleRate));
		}
	}

	return excitation;
};

const addResonance = (
	samples: Float32Array,
	excitation: Float32Array,
	mode: Mode,
	sampleRate: number,
): void => {
	const frequencyHz = Math.min(vary(mode.frequencyHz, 0.01), sampleRate / 3);
	const angle = (2 * Math.PI * frequencyHz) / sampleRate;
	const radius = Math.exp(-1 / (vary(mode.decaySeconds, 0.08) * sampleRate));
	const feedback1 = 2 * radius * Math.cos(angle);
	const feedback2 = -radius * radius;
	const gain = vary(mode.gain, 0.08) * Math.sin(angle);
	let previous1 = 0;
	let previous2 = 0;

	for (let frame = 0; frame < samples.length; frame += 1) {
		const output =
			(excitation[frame] ?? 0) +
			feedback1 * previous1 +
			feedback2 * previous2;
		previous2 = previous1;
		previous1 = output;
		samples[frame] = (samples[frame] ?? 0) + output * gain;
	}
};

const normalize = (samples: Float32Array, sampleRate: number): void => {
	const peak = samples.reduce(
		(max, sample) => Math.max(max, Math.abs(sample)),
		0,
	);
	if (peak === 0) return;

	const fadeFrameCount = endFadeSeconds * sampleRate;

	for (let frame = 0; frame < samples.length; frame += 1) {
		const endFade = Math.min(1, (samples.length - frame) / fadeFrameCount);
		samples[frame] = ((samples[frame] ?? 0) / peak) * peakLevel * endFade;
	}
};

const createTickSound = (): GeneratedSound =>
	new GeneratedSound((sampleRate) => {
		const frameCount = Math.ceil(sampleRate * tickDurationSeconds);
		const samples = new Float32Array(frameCount);
		const excitation = createExcitation(frameCount, sampleRate);

		for (let frame = 1; frame < frameCount; frame += 1) {
			samples[frame] =
				((excitation[frame] ?? 0) - (excitation[frame - 1] ?? 0)) *
				directClickGain;
		}
		for (const mode of modes) {
			addResonance(samples, excitation, mode, sampleRate);
		}
		normalize(samples, sampleRate);

		return samples;
	});

const tickSounds: GeneratedSound[] = Array.from(
	{ length: variantCount },
	createTickSound,
);
