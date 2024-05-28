import { Gfx, Size } from "engine";
import { Point3 } from "engine/math";
import { SimpleMesh } from "engine/mesh";
import { TerrainPipeline } from "./pipelines/terrain";
import { hsl } from "engine/color";

export class TerrainMesh extends SimpleMesh {
	private terrainPipeline: TerrainPipeline;

	constructor(
		gfx: Gfx,
		private size: Size,
		private chunkId: Point3,
		private seed: number,
		terrainPipeline?: TerrainPipeline,
	) {
		super(gfx);
		this.terrainPipeline = terrainPipeline || new TerrainPipeline(this.gfx, DEFAULT_COLORS);
		this.createVertexBuffer();
	}

	private async createVertexBuffer() {
		this.vertexBuffer = await this.terrainPipeline.createVertexBuffer(this.size, this.chunkId, this.seed);
		this.vertexCount = this.size[0] * this.size[1] * 6;
	}
}

export const DEFAULT_COLORS = [
	hsl(0.14, 0.5, 0.5),
	hsl(0.3, 0.5, 0.3),
	hsl(0.3, 0.6, 0.4),
	hsl(0.0, 0.0, 0.3),
	hsl(0.0, 0.0, 0.3),
	hsl(0.0, 0.0, 0.3),
	hsl(0.0, 0.0, 0.3),
	hsl(0.0, 0.0, 0.3),
	hsl(0.0, 0.0, 0.3),
	hsl(0.0, 0.0, 0.3),
	hsl(0.0, 0.0, 0.3),
	hsl(0.0, 0.0, 0.3),
	hsl(0.0, 0.0, 0.3),
	hsl(0.0, 0.0, 0.3),
];
