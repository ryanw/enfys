import { Gfx } from 'engine';
import { TerrainChunk, TerrainExtractPipeline } from './pipelines/terrain_extract';
import { Point2, Point3 } from 'engine/math';
import { hsl } from 'engine/color';
import { getParam } from './helpers';
import { scale, subtract } from 'engine/math/vectors';

export const TERRAIN_CHUNK_SIZE = 1024;
export type TerrainId = string;

export class TerrainCache {
	private _seed: number = 0;
	private extractTerrain: TerrainExtractPipeline;
	private chunks: Map<TerrainId, TerrainChunk | null> = new Map();

	constructor(gfx: Gfx, seed: number) {
		this._seed = seed;
		this.extractTerrain = new TerrainExtractPipeline(gfx);
		if (DEBUG && getParam('debug') == '2') {
			//this.debugExtract();
		}
	}

	async heightAt(point: Point2 | Point3): Promise<number> {
		let p: Point2 = [0, 0];
		if (point.length === 3) {
			p = [point[0], point[2]].map(Math.floor) as Point2;
		}
		else {
			p = [point[0], point[1]].map(Math.floor) as Point2;
		}
		const coord = p.map(v => Math.floor(v / TERRAIN_CHUNK_SIZE)) as Point2;
		const id = coord.join(',');
		let chunk = this.chunks.get(id);
		if (!chunk) {
			if (chunk === null) {
				console.info('Waiting for chunk', id);
				chunk = await new Promise<TerrainChunk>((resolve) => {
					const t = setInterval(() => {
						const chunk = this.chunks.get(id);
						if (chunk) {
							console.info('Chunk arrived', id);
							clearInterval(t);
							resolve(chunk);
						}
					}, 1);
				});
			} else {
				console.debug('Building chunk', id);
				this.chunks.set(id, null);
				chunk = await this.buildChunk(coord);
				this.chunks.set(id, chunk);
			}
		}
		const q = subtract(p, scale(coord, TERRAIN_CHUNK_SIZE));
		const idx = q[0] + q[1] * TERRAIN_CHUNK_SIZE;
		return chunk.pixels[idx];
	}

	async debugChunk(chunk: TerrainChunk) {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d')!;
		canvas.style.pointerEvents = 'none';
		canvas.style.width = '256px';
		canvas.style.position = 'absolute';
		canvas.style.left = ((chunk.origin[0] + 512) / 4) + 'px';
		canvas.style.bottom = ((chunk.origin[1] + 512) / 4) + 'px';
		canvas.style.zIndex = '1000';
		canvas.style.transform = 'scaleY(-1)';
		document.body.appendChild(canvas);

		const [w, h] = chunk.size;
		canvas.width = w;
		canvas.height = h;
		const pixels = new Uint8ClampedArray(w * h * 4);
		for (let i = 0; i < chunk.pixels.length; i++) {
			const idx = i * 4;
			const height = mod(chunk.pixels[i] / 64.0, 1.0);
			const grey = chunk.pixels[i] / 128.0;
			let color = hsl(1.0 - height, 0.7, 0.4);
			if (grey < 0.0) {
				// Water
				const g = Math.max(0.2, 1 - Math.abs(grey) * 4);
				color = [0x00, g * 0x99, g * 0xdd, 0xff];
			} else {
				// Land
				const g = Math.max(0.1, grey);
				color = [g * 0x33, g * 0xff, g * 0x11, 0xff];
			}
			pixels[idx + 0] = color[0];
			pixels[idx + 1] = color[1];
			pixels[idx + 2] = color[2];
			pixels[idx + 3] = color[3];
		}
		ctx.putImageData(new ImageData(pixels, w, h), 0, 0);
	}

	async debugExtract() {
		const coords: Point2[] = [
			[-512, -512],
			[512, -512],
			[1536, -512],
			[2560, -512],
			[-512, 512],
			[512, 512],
			[1536, 512],
		];
		const el = document.createElement('div');
		el.style.position = 'absolute';
		el.style.border = '1px solid red';
		el.style.pointerEvents = 'none';
		el.style.opacity = '0.5';
		el.style.height = '100%';

		const marker = document.createElement('div');
		marker.style.position = 'absolute';
		marker.style.background = 'rgba(200, 10, 230, 0.5)';
		marker.style.overflow = 'hidden';
		marker.style.width = '8px';
		marker.style.height = '8px';
		marker.style.borderRadius = '4px';
		marker.style.marginLeft = '-4px';
		marker.style.marginBottom = '-4px';

		el.appendChild(marker);
		document.body.appendChild(el);
		for (const coord of coords) {
		}
	}

	async buildChunk(coord: Point2): Promise<TerrainChunk> {
		const origin = coord.map(v => Math.floor(v) * TERRAIN_CHUNK_SIZE) as Point2;
		const result = await this.extractTerrain.extractChunk(origin, [TERRAIN_CHUNK_SIZE, TERRAIN_CHUNK_SIZE], this._seed);
		const id = coord.join(',');
		this.chunks.set(id, result);
		if (DEBUG && getParam('debug') == '2') {
			this.debugChunk(result);
		}
		return result;
	}
}
function mod(a: number, b: number): number {
	return ((a % b) + b) % b;
}
