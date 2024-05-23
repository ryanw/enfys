import { Point2 } from "engine/math";

export type Chunk = {
	lod: number,
	position: Point2,
};


export class Chunker {
	activeChunks: Array<Chunk> = [];
	queuedChunks: Array<Chunk> = [];
	expiredChunks: Array<Chunk> = [];

	constructor(
		private maxLod: number = 5,
		public point: Point2 = [0, 0],
	) {
		const chunks = recursiveSubdivide(maxLod, point);
		this.activeChunks.push(...chunks);
	}

	move(x: number, y: number) {
		this.point = [x, y];
		this.activeChunks = recursiveSubdivide(this.maxLod, this.point);
	}
}

export function recursiveSubdivide(lod: number, p: Point2): Array<Chunk> {
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
	for (const sub of subdivideChunk(p, lod + 1)) {
		if (lod > 0 && chunkContains(sub, lod, p)) {
			// Subdivide chunk point is inside
			chunks.push(...recursiveSubdivide(lod - 1, p));
		} else {
			// Append chunks the point is outside
			chunks.push({ lod, position: [...sub] });
		}
	}

	return chunks;
}

function chunkContains(chunk: Point2, lod: number, point: Point2): boolean {
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
	const half = scale / 2;
	const chunk = [
		Math.floor(p[0] / scale) * scale,
		Math.floor(p[1] / scale) * scale,
	] as Point2;

	return [
		chunk,
		[chunk[0] + half, chunk[1]],
		[chunk[0], chunk[1] + half],
		[chunk[0] + half, chunk[1] + half],
	];
}
