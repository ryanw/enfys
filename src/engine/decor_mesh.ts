import { Gfx } from 'engine';
import { Plane, Point2 } from 'engine/math';
import { ColorVertex, SimpleMesh } from 'engine/mesh';
import { ClippingPlanes } from 'engine/camera';
import { DecorPipeline, DecorUniform } from './pipelines/decor';

const NullPlane: Plane = [[0, 0, 0], [0, 0, 0]];

export class DecorMesh extends SimpleMesh {
	protected pipeline: DecorPipeline;
	protected uniform: DecorUniform;
	instanceBackBuffer!: GPUBuffer;
	clippingPlanes: ClippingPlanes = [NullPlane, NullPlane, NullPlane, NullPlane, NullPlane, NullPlane];

	constructor(
		gfx: Gfx,
		vertices: Array<ColorVertex> = [],
		private position: Point2,
		readonly density: number,
		readonly spacing: number,
		readonly terrainSeed: number,
		readonly decorSeed: number,
		public radius: number = 5,
		heightSource?: string,
	) {
		super(gfx, vertices);
		this.pipeline = new DecorPipeline(gfx, heightSource);
		this.uniform = new DecorUniform(gfx);
		this.createInstanceBuffers();
		this.updateUniform();
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
			// FIXME improve nesting
			'clipping[0].origin': this.clippingPlanes[0][0],
			'clipping[0].normal': this.clippingPlanes[0][1],
			'clipping[1].origin': this.clippingPlanes[1][0],
			'clipping[1].normal': this.clippingPlanes[1][1],
			'clipping[2].origin': this.clippingPlanes[2][0],
			'clipping[2].normal': this.clippingPlanes[2][1],
			'clipping[3].origin': this.clippingPlanes[3][0],
			'clipping[3].normal': this.clippingPlanes[3][1],
			'clipping[4].origin': this.clippingPlanes[4][0],
			'clipping[4].normal': this.clippingPlanes[4][1],
			'clipping[5].origin': this.clippingPlanes[5][0],
			'clipping[5].normal': this.clippingPlanes[5][1],
		});
	}

	protected createInstanceBuffers() {
		this.instanceCount = 0;
		this.instanceBuffer = this.pipeline.createEmptyInstanceBuffer();
		this.instanceBackBuffer = this.pipeline.createEmptyInstanceBuffer();
	}

	async updateInstanceBuffer(): Promise<void> {
		return this.pipeline.updateInstanceBuffer(this.instanceBackBuffer, this.uniform, this.radius)
			.then(count => {
				if (count > 0) {
					this.instanceCount = count;
					this.swapBuffers();
				}
			});
	}

	move(x: number, y: number) {
		const dx = Math.abs(this.position[0] - x);
		const dy = Math.abs(this.position[1] - y);
		const rotated = 1000; // TODO
		if (dx < 16 && dy < 16 && rotated < 10) {
			// Haven't moved enough
			return;
		}
		this.position = [x, y];
		this.updateUniform();
		this.updateInstanceBuffer();

	}

	swapBuffers() {
		const back = this.instanceBackBuffer;
		this.instanceBackBuffer = this.instanceBuffer;
		this.instanceBuffer = back;
	}
}
