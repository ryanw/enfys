import { Gfx, Size } from "engine";
import { Point3 } from "engine/math";
import { SimpleMesh } from "engine/mesh";
import { TerrainPipeline } from "./pipelines/terrain";

export class TerrainMesh extends SimpleMesh {
	private terrainPipeline: TerrainPipeline;

	constructor(
		gfx: Gfx,
		private size: Size,
		private chunkId: Point3,
		private seed: number,
	) {
		super(gfx);
		this.terrainPipeline = new TerrainPipeline(this.gfx);
		this.createVertexBuffer();
	}

	private async createVertexBuffer() {
		this.buffer = await this.terrainPipeline.createVertexBuffer(this.size, this.chunkId, this.seed);
		this.vertexCount = this.size[0] * this.size[1] * 6;
	}
}
