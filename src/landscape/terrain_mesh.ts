import { Gfx, Size } from 'engine';
import { Point3 } from 'engine/math';
import { SimpleMesh } from 'engine/mesh';
import { TerrainPipeline } from './pipelines/terrain';
import { hsl } from 'engine/color';
import { ColorScheme } from './color_scheme';

export class TerrainMesh extends SimpleMesh {
	private terrainPipeline: TerrainPipeline;

	constructor(
		gfx: Gfx,
		readonly size: Size,
		readonly chunkId: Point3,
		private terrainSeed: number,
		colorSeed: number,
		terrainPipeline?: TerrainPipeline,
	) {
		super(gfx);
		this.terrainPipeline = terrainPipeline || new TerrainPipeline(this.gfx, new ColorScheme(colorSeed));
		this.createVertexBuffer();
	}

	private async createVertexBuffer() {
		this.vertexBuffer = await this.terrainPipeline.createVertexBuffer(this.size, this.chunkId, this.terrainSeed);
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
