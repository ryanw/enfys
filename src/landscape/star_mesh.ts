import { Gfx, calculateNormals } from 'engine';
import { Point3 } from 'engine/math';
import { ColorVertex, buildIcosahedron, SimpleMesh } from 'engine/mesh';
import { StarPipeline } from './pipelines/star';

export class StarMesh extends SimpleMesh {
	private pipeline: StarPipeline;

	constructor(
		gfx: Gfx,
		readonly position: Point3,
		readonly radius: number,
		readonly density: number,
		readonly seed: number,
	) {
		const vertices = buildIcosahedron(position => ({
			position: [...position],
			normal: [0, 0, 0],
			color: BigInt(0xffffffff),
		} as ColorVertex));
		calculateNormals(vertices);
		super(gfx, vertices);
		this.pipeline = new StarPipeline(this.gfx);
		this.createInstanceBuffer();
	}

	private async createInstanceBuffer() {
		const [buffer, count] = await this.pipeline.createInstanceBuffer(
			this.position,
			this.radius,
			this.density,
			this.seed,
		);
		console.debug('Created %i Star instances', count);
		this.instanceBuffer = buffer;
		this.instanceCount = count;
	}
}
