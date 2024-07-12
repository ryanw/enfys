import { Gfx } from 'engine';
import { Vector3 } from './math';

export class ShadowMap {
	/**
	 * Texture to store the shadow map
	 */
	texture: GPUTexture;
	private _size: Vector3;

	get size(): Vector3 {
		return [...this._size];
	}

	constructor(readonly gfx: Gfx, size: Vector3) {
		const { device } = gfx;
		this._size = size;
		this.texture = device.createTexture({
			label: 'ShadowMap Texture',
			format: 'depth32float',
			size,
			dimension: '2d',
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
		});
	}
}
