import { Gfx } from "engine";
import { Point3 } from "./math";
import { ColorVertex, SimpleMesh } from "./mesh";
import { INSTANCE_SIZE, PARTICLE_SIZE, ParticlePipeline } from "./pipelines/particle";

export class Particles extends SimpleMesh {
	public count = 0;
	private pipeline: ParticlePipeline;
	/**
	 * Stores additional particle data needed for simulation, but not needed for rendering
	 */
	private particleBuffer?: GPUBuffer;
	private t: number = 0;
	private _capacity = 0;

	constructor(
		gfx: Gfx,
		vertices: Array<ColorVertex> = [],
		/**
		 * Where particles spawn from
		 */
		public origin: Point3,
		capacity: number,
		readonly seed: number,
	) {
		super(gfx, vertices);
		this._capacity = capacity;
		this.pipeline = new ParticlePipeline(gfx);
		this.createInstanceBuffer();
	}

	private async createInstanceBuffer() {
		const [instances, particles] = await this.pipeline.createInstanceBuffer(
			this.origin,
			this._capacity,
			this.seed,
		);
		console.debug('Created %i Particle instances', this._capacity);
		this.particleBuffer = particles;
		this.instanceBuffer = instances;
		this.instanceCount = this._capacity;

	}

	get capacity(): number {
		return this._capacity;
	}

	set capacity(capacity: number) {
		const oldCapacity = this._capacity;
		this._capacity = capacity;
		if (this._capacity > oldCapacity) {
			//this.resetParticles(oldCapacity, this._capacity);
		}
	}

	resetParticles(start: number, end: number) {
		const min = Math.min(start, end) | 0;
		const max = Math.max(start, end) | 0 + 1;
		if (this.instanceBuffer) {
			const instanceOffset = min * INSTANCE_SIZE;
			const instanceData = new ArrayBuffer((max - min) * INSTANCE_SIZE);
			this.gfx.device.queue.writeBuffer(this.instanceBuffer, instanceOffset, instanceData);
		}

		if (this.particleBuffer) {
			const particleOffset = min * PARTICLE_SIZE;
			const particleData = new ArrayBuffer((max - min) * PARTICLE_SIZE);
			this.gfx.device.queue.writeBuffer(this.particleBuffer, particleOffset, particleData);
		}

	}

	update(time: number) {
		const dt = time - this.t;
		this.t = time;
		if (!this.particleBuffer || !this.instanceBuffer) return;
		this.pipeline.updateParticles(
			this.instanceBuffer,
			this.particleBuffer,
			time,
			dt,
			this.origin,
			this.count,
			this.capacity,
			this.seed,
		);
	}
}
