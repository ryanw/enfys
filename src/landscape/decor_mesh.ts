import { Gfx } from 'engine';
import { Point2 } from 'engine/math';
import { ColorVertex, SimpleMesh } from 'engine/mesh';
import { BuildingPipeline, DecorPipeline, DecorUniform } from './pipelines/decor';

export class DecorMesh extends SimpleMesh {
	protected pipeline: DecorPipeline;
	protected uniform: DecorUniform;

	constructor(
		gfx: Gfx,
		vertices: Array<ColorVertex> = [],
		private position: Point2,
		readonly density: number,
		readonly spacing: number,
		readonly terrainSeed: number,
		readonly decorSeed: number,
		public radius: number = 5,
	) {
		super(gfx, vertices);
		this.pipeline = new DecorPipeline(gfx);
		this.uniform = new DecorUniform(gfx);
		this.updateUniform();
		this.createInstanceBuffer();
	}

	protected updateUniform() {
		const p: Point2 = [
			(this.position[0] / this.spacing | 0) * this.spacing,
			(this.position[1] / this.spacing | 0) * this.spacing,
		];

		this.uniform.replace({
			position: p,
			spacing: [this.spacing, this.spacing],
			density: this.density,
			terrainSeed: this.terrainSeed,
			decorSeed: this.decorSeed,
		});
	}

	protected async createInstanceBuffer() {
		const [buffer, count] = await this.pipeline.createInstanceBuffer(this.uniform, this.radius);
		console.debug('Created %i Decor instances', count);
		this.instanceBuffer = buffer;
		this.instanceCount = count;
	}

	move(x: number, y: number) {
		const dx = Math.abs(this.position[0] - x);
		const dy = Math.abs(this.position[1] - y);
		if (dx < 16 && dy < 16) {
			// Haven't moved enough
			return;
		}
		if (DEBUG) {
			console.debug("Moving decor", x, y);
		}
		this.position = [x, y];
		this.updateUniform();
		this.pipeline.updateInstanceBuffer(this.instanceBuffer, this.uniform, this.radius).then(count => {
			// FIXME flicker when reducing instance count
			if (count > this.instanceCount) {
				this.instanceCount = count;
			}
		});
	}
}

export class BuildingMesh extends DecorMesh {
	constructor(
		gfx: Gfx,
		vertices: Array<ColorVertex> = [],
		position: Point2,
		density: number,
		spacing: number,
		terrainSeed: number,
		decorSeed: number,
		radius: number = 5,
	) {
		super(gfx, vertices, position, density, spacing, terrainSeed, decorSeed, radius);
		this.pipeline = new BuildingPipeline(gfx);
		this.createInstanceBuffer();
	}
}
