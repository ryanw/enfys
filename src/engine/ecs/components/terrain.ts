import { Entity } from 'engine/ecs';
import { Component } from 'engine/ecs/components';
import { Point2 } from 'engine/math';
import { Size } from 'engine';
import { Chunk, ChunkKey } from 'engine/terrain';

export class TerrainComponent extends Component {
	chunks: Map<ChunkKey, Chunk> = new Map();
	currentChunk: Point2 = [-1, -1];
	chunkSize: Size = [128, 128];

	constructor(
		public terrainSeed: number,
		public colorSeed: number,
		public target?: Entity,
	) {
		super();
	}
}
