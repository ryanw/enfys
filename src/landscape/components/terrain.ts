import { Entity } from "engine/ecs";
import { Component } from "engine/ecs/components";
import { Chunk, ChunkKey } from "../chunker";
import { Point2 } from "engine/math";
import { Size } from "engine";

export class TerrainComponent extends Component {
	chunks: Map<ChunkKey, Chunk> = new Map();
	currentChunk: Point2 = [-1, -1];
	chunkSize: Size = [128, 128];

	constructor(
		public seed: number,
		public target?: Entity,
	) {
		super();
	}
}
