import { Gfx } from "engine";
import { Point3 } from "./math";
import { ColorInstance, ColorVertex, Mesh, SimpleMesh, Vertex } from "./mesh";
import { ParticlePipeline } from "./pipelines/particle";

export class Particles extends SimpleMesh {
	private pipeline: ParticlePipeline;
	/**
	 * Stores additional particle data needed for simulation, but not needed for rendering
	 */
	private particleBuffer?: GPUBuffer;
	private t: number = 0;

	constructor(
		gfx: Gfx,
		vertices: Array<ColorVertex> = [],
		/**
		 * Where particles spawn from
		 */
		public origin: Point3,
		readonly radius: number,
		readonly count: number,
		readonly seed: number,
	) {
		super(gfx, vertices);
		this.pipeline = new ParticlePipeline(gfx);
		this.createInstanceBuffer();
	}

	private async createInstanceBuffer() {
		const [instances, particles] = await this.pipeline.createInstanceBuffer(
			this.origin,
			this.radius,
			this.count,
			this.seed,
		);
		console.debug('Created %i Particle instances', this.count);
		this.particleBuffer = particles;
		this.instanceBuffer = instances;
		this.instanceCount = this.count;

	}

	reset() {
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
			this.radius,
			this.count,
			this.seed,
		);
	}
}
