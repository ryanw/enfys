export async function thrusterSound(liveCtx: AudioContext): Promise<AudioBuffer> {
	const volume = 0.25;
	const duration = 2;
	const bufferSize = liveCtx.sampleRate * duration;
	const ctx = new OfflineAudioContext(1, bufferSize, liveCtx.sampleRate);
	const t = ctx.currentTime;

	const baseOsc = new OscillatorNode(ctx, {
		type: 'sine',
		frequency: 96,
	});
	const baseGain = new GainNode(ctx, { gain: volume / 10 });

	const freqOsc = new OscillatorNode(ctx, {
		type: 'sine',
		frequency: 6,
	});
	const freqGain = new GainNode(ctx, { gain: 10.0 });
	const freqFilter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 2 });


	// Random static
	const noiseBuffer = ctx.createBuffer(1, bufferSize, liveCtx.sampleRate);;
	const noiseData = noiseBuffer.getChannelData(0);
	const noiseSrc = new AudioBufferSourceNode(ctx, { buffer: noiseBuffer, loop: true });
	for (let i = 0; i < bufferSize; i++) {
		noiseData[i] = Math.random() * 2.0 - 1.0;
	}
	const noiseGain = new GainNode(ctx, { gain: volume });
	const noiseFilter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 1000 });

	baseOsc.connect(baseGain);
	noiseSrc.connect(noiseFilter).connect(noiseGain);
	freqOsc.connect(freqGain).connect(baseGain).connect(noiseGain).connect(ctx.destination);

	noiseSrc.start();
	baseOsc.start();
	freqOsc.start();

	return await ctx.startRendering();
}
