import { Gfx, Size, calculateNormals } from "engine";
import { Point3 } from "engine/math";
import { CUBE_VERTS, ColorVertex, Icosahedron, SimpleMesh, TextureVertex } from "engine/mesh";
import { TreePipeline } from "./pipelines/tree";

export class TreeMesh extends SimpleMesh {
	private pipeline: TreePipeline;

	constructor(
		gfx: Gfx,
		readonly position: Point3,
		readonly radius: number,
		readonly density: number,
		readonly seed: number,
	) {
		const vertices = buildTreeMesh(position => ({
			position: [...position],
			normal: [0, 0, 0],
			color: [0.41, 0.24, 0.81, 1.0]
		} as ColorVertex));
		calculateNormals(vertices);
		super(gfx, vertices);
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

export function buildTreeMesh<T>(callback: (position: Point3, index: number) => T): Array<T> {
	const trunk: Point3[] = CUBE_VERTS.map(p => [p[0] / 3.0, p[1] * 10.0, p[2] / 3.0]);
	const bush: Point3[] = CUBE_VERTS.map(p => [p[0] * 3.0, p[1] * 3.0 + 10.0, p[2] * 3.0]);
	return [...trunk, ...bush].map(callback);
}
