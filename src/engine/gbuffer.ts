import { Gfx, Size } from 'engine';

export const DEPTH_FORMAT: GPUTextureFormat = 'depth16unorm';

export class GBuffer {
	albedo!: GPUTexture;
	depth!: GPUTexture;
	private _size: Size = [1, 1];

	constructor(readonly gfx: Gfx, size: Size = [0, 0]) {
		this.size = size;
	}

	get size(): Size {
		return [...this._size];
	}

	set size(size: Size) {
		if (this._size[0] === size[0] && this._size[1] === size[1]) {
			return;
		}
		this._size = [...size];
		if (this._size[0] < 1 || this._size[1] < 1) {
			return;
		}
		this.albedo = this.gfx.createTexture('rgba8unorm', this.size, 'GBuffer Albedo Texture');
		this.depth = this.gfx.createTexture('depth32float', this.size, 'GBuffer Depth Texture');
	}
}
