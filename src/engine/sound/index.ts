import { ResourceId } from "engine/resource";

export type SoundBuilder = (ctx: AudioContext) => AudioBuffer | Promise<AudioBuffer>;

export class SoundEffect {
	buffer?: AudioBuffer;
	private source?: AudioBufferSourceNode;
	private gain?: GainNode;
	private isPlaying: boolean = false;

	constructor(readonly sound: Sound, readonly builder: SoundBuilder) {
	}

	async build() {
		if (!this.sound.isReady()) {
			throw new Error("AudioContext not initialised");
		}
		this.buffer = await this.builder(this.sound.ctx!);
		if (this.isPlaying) {
			this.start();
		}
	}

	start(volume: number = 1.0) {
		this.isPlaying = true;
		if (!this.buffer) {
			return;
		}
		const { ctx } = this.sound;
		if (!ctx) return;

		const source = new AudioBufferSourceNode(ctx, { buffer: this.buffer!, loop: true });
		const gain = new GainNode(this.sound.ctx!, { gain: 0.01 });

		// Fade in
		gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.03);

		source.connect(gain).connect(ctx.destination);
		source.start();

		this.source = source;
		this.gain = gain;
	}

	stop() {
		this.isPlaying = false;
		if (!this.sound || !this.gain) return;
		const ctx = this.sound.ctx!;
		const source = this.source!;
		this.gain.gain.setValueAtTime(this.gain.gain.value, ctx.currentTime);
		this.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
		setTimeout(() => source.stop(), 300);
	}
}

export class Sound {
	ctx?: AudioContext;
	queue: Array<SoundEffect> = [];
	resources: Map<ResourceId, SoundEffect> = new Map();
	muted = false;

	constructor() {
		// Only allowed to enable sound after a "user geasture"
		const events = ['mousedown', 'touchstart', 'keydown', 'pointerdown', 'click'];
		const callback = () => {
			events.forEach(e => window.removeEventListener(e, callback));
			this.init();
		};
		events.forEach(e => window.addEventListener(e, callback));
	}

	init() {
		if (this.ctx) return;
		this.ctx = new AudioContext();
		if (this.muted) {
			this.ctx.suspend();
		}
		this.queue.forEach(s => s.build());
		this.queue = [];
	}

	mute(muted: boolean) {
		if (muted === this.muted) return;
		this.muted = muted;
		if (this.ctx) {
			muted ? this.ctx.suspend() : this.ctx.resume();
		}
	}

	isReady(): boolean {
		return !!this.ctx;
	}

	create(name: ResourceId, builder: SoundBuilder): SoundEffect {
		const effect = new SoundEffect(this, builder);
		if (this.isReady()) {
			effect.build();
		}
		else {
			this.queue.push(effect);
		}
		this.resources.set(name, effect);

		return effect;
	}

	play(name: ResourceId) {
		const sound = this.resources.get(name);
		if (!sound) return;

		sound.start();
	}

	stop(name: ResourceId) {
		const sound = this.resources.get(name);
		if (!sound) return;

		sound.stop();
	}
}
