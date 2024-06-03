import { Gfx } from 'engine';
import { Point3 } from 'engine/math';
import { ColorVertex, SimpleMesh } from 'engine/mesh';
import { DecorPipeline } from './pipelines/decor';

export class DecorMesh extends SimpleMesh {
	private pipeline: DecorPipeline;

	constructor(
		gfx: Gfx,
		vertices: Array<ColorVertex> = [],
		readonly position: Point3,
		readonly radius: number,
		readonly density: number,
		readonly terrainSeed: number,
		readonly decorSeed: number,
	) {
		super(gfx, vertices);
		this.pipeline = new DecorPipeline(this.gfx);
		this.createInstanceBuffer();
	}

	private async createInstanceBuffer() {
		const [buffer, count] = await this.pipeline.createInstanceBuffer(
			this.position,
			this.radius,
			this.density,
			this.terrainSeed,
			this.decorSeed,
		);
		console.debug('Created %i Decor instances', count);
		this.instanceBuffer = buffer;
		this.instanceCount = count;
	}
}
