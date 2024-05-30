import { Point2, Point3 } from 'engine/math';
import { Entity, Scene } from 'engine/scene';
import { TerrainMesh } from './terrain_mesh';
import { Color, Gfx, Size } from 'engine';
import { translation } from 'engine/math/transform';
import { add } from 'engine/math/vectors';
import { TerrainPipeline } from './pipelines/terrain';

export type Chunk = {
	lod: number,
	position: Point2,
};

export function generateChunks(x: number, y: number, minLod: number = 0, maxLod: number = 6) {
	const point = [x, y] as Point2;
	const range = 1;
	let chunks: Array<Chunk> = [];
	for (let lod = minLod; lod < maxLod; lod++) {
		const scale = 1 << lod;
		for (let y = -range; y <= range; y++) {
			for (let x = -range; x <= range; x++) {
				chunks = [
					...chunks,
					...recursiveSubdivide(add(point, [x * scale, y * scale]), maxLod, lod),
				];
			}
		}
	}
	return removeOverlaps(removeDuplicateChunks(chunks));
}

function equalChunks(c0: Chunk, c1: Chunk): boolean {
	return (
		c0.lod == c1.lod &&
		c0.position[0] == c1.position[0] &&
		c0.position[1] == c1.position[1]
	);
}

function chunkOverlaps(c0: Chunk, c1: Chunk): boolean {
	const w0 = (1 << c0.lod);
	const w1 = (1 << c1.lod);
	const s0 = c0.position;
	const s1 = c1.position;
	const e0 = add(c0.position, [w0 - 0.01, w0 - 0.01]);
	const e1 = add(c1.position, [w1 - 0.01, w1 - 0.01]);

	const overlapX = (e0[0] >= s1[0]) && (e1[0] >= s0[0]);
	const overlapY = (e0[1] >= s1[1]) && (e1[1] >= s0[1]);

	return overlapX && overlapY;
}

function removeDuplicateChunks(chunks: Array<Chunk>): Array<Chunk> {
	return chunks.filter((chunk, i) => i === chunks.findIndex(innerChunk => equalChunks(chunk, innerChunk)));
}

function removeOverlaps(chunks: Array<Chunk>): Array<Chunk> {
	return chunks.filter(chunk => {
		// If  a smaller (lower lod) chunk overlaps, remove this chunk
		const smallerExists = chunks.findIndex(other => {
			if (other.lod >= chunk.lod) return false;
			return chunkOverlaps(chunk, other);
		}) > -1;

		return !smallerExists;
	});
}

export type ChunkKey = string;
export function toChunkHash(chunk: Chunk): ChunkKey {
	return [chunk.lod, ...chunk.position].join(',');
}


export class Chunker {
	liveChunks: Map<ChunkKey, Chunk> = new Map();
	queuedChunks: Map<ChunkKey, Chunk> = new Map();
	activeChunks: Map<ChunkKey, Chunk> = new Map();
	entities: Map<ChunkKey, Entity<TerrainMesh>> = new Map();
	chunkSize: Size = [128, 128];
	private terrainPipeline: TerrainPipeline;

	constructor(
		readonly gfx: Gfx,
		public seed: number,
		public maxLod: number = 5,
		public point: Point2 = [0, 0],
		colorScheme: Array<Color>,
	) {
		this.terrainPipeline = new TerrainPipeline(this.gfx, colorScheme);
		this.move(...point);
	}

	move(x: number, y: number, minLod: number = 0) {
		this.point = [x, y];
		this.activeChunks = new Map();
		const chunks = generateChunks(x / this.chunkSize[0], y / this.chunkSize[1], minLod, this.maxLod);
		for (const chunk of chunks) {
			this.activeChunks.set(toChunkHash(chunk), chunk);
		}
		this.updateQueue();
	}

	processQueue(scene: Scene) {
		const chunkies = this.queuedChunks.keys();
		for (const key of chunkies) {
			const chunk = this.queuedChunks.get(key);
			if (!chunk) continue;
			this.queuedChunks.delete(key);
			this.generateChunk(scene, chunk);
		}
		// Timeout to avoid flicker
		setTimeout(() => this.removeExpiredChunks(scene), 10);
	}

	private removeExpiredChunks(scene: Scene) {
		for (const [key, _chunk] of this.liveChunks.entries()) {
			if (this.activeChunks.has(key)) continue;
			// Chunk has expired, remove it
			const entity = this.entities.get(key);
			if (!entity) continue;
			scene.removeEntity(entity);
			this.liveChunks.delete(key);
		}
	}

	private generateChunk(scene: Scene, chunk: Chunk) {
		const scale = 1 << chunk.lod;
		const chunkId: Point3 = [
			chunk.position[0] / scale | 0,
			chunk.position[1] / scale | 0,
			chunk.lod,
		];
		const position: Point3 = [
			chunkId[0] * scale * this.chunkSize[0],
			0,
			chunkId[1] * scale * this.chunkSize[1],
		];
		const key = toChunkHash(chunk);
		this.liveChunks.set(key, chunk);
		const terrain = scene.addMesh(
			new TerrainMesh(
				scene.gfx,
				this.chunkSize,
				chunkId,
				this.seed,
				this.terrainPipeline,
			),
			translation(...position),
		);
		terrain.material.receiveShadows = true;
		//terrain.material = new Material(scene.gfx, hsl(chunkId[2] / 7, 0.5, 0.5));
		this.entities.set(toChunkHash(chunk), terrain);
	}

	private updateQueue() {
		for (const [key, chunk] of this.activeChunks.entries()) {
			if (this.liveChunks.has(key)) continue;
			this.queuedChunks.set(key, chunk);
		}
	}

}

export function recursiveSubdivide(p: Point2, lod: number, minLod: number = 0): Array<Chunk> {
	const chunks: Array<Chunk> = [];
	if (lod === 0) {
		const q = p.map(v => Math.floor(v / 2) * 2) as Point2;
		return [
			{ lod, position: q },
			{ lod, position: [q[0] + 1, q[1]] },
			{ lod, position: [q[0] + 1, q[1] + 1] },
			{ lod, position: [q[0], q[1] + 1] },
		];
	}
	for (const sub of subdivideChunk(p, lod)) {
		// Subdivide chunk that the point is inside
		if (lod > minLod) {
			if (chunkContains(sub, p, lod)) {
				chunks.push(...recursiveSubdivide(p, lod - 1, minLod));
				continue;
			}
		}

		// Append chunks the point is outside
		chunks.push({ lod, position: [...sub] });
	}

	return chunks;
}

function chunkContains(chunk: Point2, point: Point2, lod: number): boolean {
	const scale = 1 << lod;
	if (point[0] < chunk[0]) return false;
	if (point[1] < chunk[1]) return false;
	if (point[0] >= chunk[0] + scale) return false;
	if (point[1] >= chunk[1] + scale) return false;

	return true;
}

export type SubdividedChunk = [Point2, Point2, Point2, Point2];

export function subdivideChunk(p: Point2, lod: number): SubdividedChunk {
	const scale = 1 << lod;
	const prevScale = scale * 2;
	const chunk = [
		Math.floor(p[0] / prevScale) * prevScale,
		Math.floor(p[1] / prevScale) * prevScale,
	] as Point2;

	return [
		chunk,
		[chunk[0] + scale, chunk[1]],
		[chunk[0], chunk[1] + scale],
		[chunk[0] + scale, chunk[1] + scale],
	];
}
