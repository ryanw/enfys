import { Gfx, Size } from "engine";
import { identity } from "./math/transform";
import { Matrix4 } from "./math";

export class ShadowMap {
	/**
	 * Texture to store the shadow map
	 */
	texture: GPUTexture;
	private _size: Size = [512, 512];
	private _viewProjection: Matrix4;

	get size(): [number, number] {
		return [...this._size];
	}

	constructor(readonly gfx: Gfx, size: Size = [512, 512]) {
		this._size = size;
		this._viewProjection = identity();
		this.texture = gfx.createTexture('depth32float', size, "ShadowMap Texture")
	}
}
