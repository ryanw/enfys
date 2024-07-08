import { Point2 } from 'engine/math';
import { add, magnitude, subtract } from 'engine/math/vectors';

export type Chunk = {
	lod: number,
	position: Point2,
};

function cleanChunks(chunks: Array<Chunk>): Array<Chunk> {
	// FIXME the performance here is bad
	return removeOverlaps(removeDuplicateChunks(chunks));
}

export function generateChunks(x: number, y: number, minLod: number = 0, maxLod: number = 6) {
	const point = [x, y] as Point2;
	const range = 2;
	const baseScale = 1 << maxLod;
	// Create base chunks to subdivide
	let chunks: Array<Chunk> = [];

	for (let y = -range; y <= range; y++) {
		for (let x = -range; x <= range; x++) {
			chunks = [
				...chunks,
				...subdivideChunk(add(point, [x * baseScale, y * baseScale]), maxLod).map(position => ({
					lod: maxLod,
					position
				})),
			];
		}
	}


	for (let lod = maxLod - 1; lod >= minLod; lod--) {
		const scale = 1 << lod;
		let nextChunks: Array<Chunk> = [];
		for (const chunk of chunks) {
			if (chunk.lod !== lod + 1) {
				continue;
			}
			const p = add(chunk.position, [scale, scale]);
			const dist = magnitude(subtract(p, point));
			if (dist < 3 * scale) {
				const lodChunks = subdivideChunk(chunk.position, lod).map(position => ({
					lod: lod,
					position
				}));
				// If distance from chunk to player is close, then subdivide
				nextChunks = cleanChunks([
					...nextChunks,
					...lodChunks
				]);
			}
		}
		chunks = cleanChunks([
			...chunks,
			...nextChunks,
		]);
	}
	return chunks;
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
