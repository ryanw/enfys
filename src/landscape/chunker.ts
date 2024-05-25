import { Point2 } from "engine/math";
import { add } from "engine/math/vectors";

export type Chunk = {
	lod: number,
	position: Point2,
};

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
	return chunks.filter((chunk, i) => {
		// If  a smaller (lower lod) chunk overlaps, remove this chunk
		const smallerExists = chunks.findIndex(other => {
			if (other.lod >= chunk.lod) return false;
			return chunkOverlaps(chunk, other);
		}) > -1;

		return !smallerExists;
	});
}

export class Chunker {
	activeChunks: Array<Chunk> = [];
	queuedChunks: Array<Chunk> = [];
	expiredChunks: Array<Chunk> = [];

	constructor(
		public maxLod: number = 5,
		public point: Point2 = [0, 0],
	) {
		this.move(...point);
	}

	move(x: number, y: number, minLod: number = 0) {
		this.point = [x, y];
		const range = 1;
		let chunks: Array<Chunk> = [];
		for (let lod = minLod; lod < this.maxLod; lod++) {
			const scale = 1 << lod;
			for (let y = -range; y <= range; y++) {
				for (let x = -range; x <= range; x++) {
					chunks = [
						...chunks,
						...recursiveSubdivide(add(this.point, [x * scale, y * scale]), this.maxLod, lod),
					];
				}
			}
		}
		const cleaned = removeOverlaps(removeDuplicateChunks(chunks));
		console.log("TOTAL", minLod, (this.maxLod - minLod), chunks.length, cleaned.length);
		this.activeChunks = cleaned;
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
		// Subdivide chunk point is inside
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

function chunkNear(chunk: Point2, point: Point2, lod: number, tolerance: number = 1.0): boolean {
	const scale = 1 << lod;
	const t = tolerance * scale;
	if (point[0] + t < chunk[0]) return false;
	if (point[1] + t < chunk[1]) return false;
	if (point[0] - t >= chunk[0] + scale) return false;
	if (point[1] - t >= chunk[1] + scale) return false;

	return true;
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
