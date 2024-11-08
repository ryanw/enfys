import { Gfx, Size } from 'engine';

export const DEPTH_FORMAT: GPUTextureFormat = 'depth16unorm';

/**
 * Geometry Buffer used for deferred rendering
 */
export class GBuffer {
	/**
	 * Texture to store the colour of each pixel
	 */
	albedo!: GPUTexture;
	/**
	 * Texture to store the normal of each pixel
	 */
	normal!: GPUTexture;
	/**
	 * Texture to store the meta data of each pixel
	 */
	meta!: GPUTexture;
	/**
	 * Texture to store the depth of each pixel
	 */
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
		this.albedo = this.gfx.createTexture('rgba16float', this.size, 'GBuffer Albedo Texture');
		this.normal = this.gfx.createTexture('rgba16float', this.size, 'GBuffer Normal Texture');
		this.meta = this.gfx.createTexture('r8uint', this.size, 'GBuffer Meta Texture');
		this.depth = this.gfx.createTexture('depth32float', this.size, 'GBuffer Depth Texture');
	}
}
