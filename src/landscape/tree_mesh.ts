import { Gfx, Size } from "engine";
import { Point3 } from "engine/math";
import { Icosahedron, SimpleMesh } from "engine/mesh";
import { TreePipeline } from "./pipelines/tree";

export class TreeMesh extends Icosahedron {
	private pipeline: TreePipeline;

	constructor(
		gfx: Gfx,
		readonly position: Point3,
		readonly radius: number,
		readonly density: number,
		readonly seed: number,
	) {
		super(gfx);
		this.pipeline = new TreePipeline(this.gfx);
		this.createInstanceBuffer();
	}

	private async createInstanceBuffer() {
		const [buffer, count] = await this.pipeline.createInstanceBuffer(
			this.position,
			this.radius,
			this.density,
			this.seed,
		);
		console.log("Created %i instances", count);
		this.instanceBuffer = buffer;
		this.instanceCount = count;
	}
}
