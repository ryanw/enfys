import { Entity } from 'engine/ecs';
import { Component } from 'engine/ecs/components';
import { Point2 } from 'engine/math';
import { Size } from 'engine';
import { Chunk, ChunkKey } from 'engine/terrain';

export class TerrainComponent extends Component {
	chunks: Map<ChunkKey, Chunk> = new Map();
	currentChunk: Point2 = [-1, -1];

	constructor(
		public terrainSeed: number,
		public colorSeed: number,
		public target?: Entity,
		public water: boolean = true,
		public chunkSize: Size = [128, 128],
	) {
		super();
	}
}
