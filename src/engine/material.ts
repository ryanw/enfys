import { Color, Gfx } from 'engine';
import { UniformBuffer } from './uniform_buffer';

/**
 * Material defines the properties of the rendered mesh
 */
export abstract class Material {
	writeDepth = true;
	abstract bindingResource(): GPUBindingResource;
}

/**
 * Simple color {@link Material} stored in a {@link GPUBuffer}
 */
export class DotMaterial extends Material {
	readonly uniform: UniformBuffer;

	constructor(
		readonly gfx: Gfx,
		private color: Color = [255, 255, 255, 255],
	) {
		super();
		this.uniform = new UniformBuffer(gfx, [
			['color', 'vec4f'],
		]);
		this.uniform.set('color', this.color.map(v => v/255));
	}

	bindingResource(): GPUBindingResource {
		return this.uniform.bindingResource();
	}
}

/**
 * Simple color {@link Material} stored in a {@link GPUBuffer}
 */
export class SimpleMaterial extends Material {
	readonly uniform: UniformBuffer;
	private _color: bigint;
	private _receiveShadows = true;
	private _fadeout = 0.0;
	private _emissive: boolean = false;

	constructor(
		readonly gfx: Gfx,
		color: number | bigint,
		public dither: boolean = false,
	) {
		super();
		this._color = BigInt(color);
		this.uniform = new UniformBuffer(gfx, [
			['color', 'u32'],
			['dither', 'u32'],
			['emissive', 'u32'],
			['receiveShadows', 'u32'],
			['fadeout', 'f32'],
		]);
		this.updateUniform();
	}

	get fadeout(): number {
		return this._fadeout;
	}

	set fadeout(distance: number) {
		this._fadeout = distance;
		this.updateUniform();
	}

	get receiveShadows(): boolean {
		return this._receiveShadows;
	}

	set receiveShadows(flag: boolean) {
		this._receiveShadows = flag;
		this.updateUniform();
	}

	get color(): bigint {
		return this._color;
	}

	set color(color: number | bigint) {
		this._color = BigInt(color);
		this.updateUniform();
	}

	get emissive(): boolean {
		return this._emissive;
	}

	set emissive(emissive: boolean) {
		this._emissive = emissive;
		this.updateUniform();
	}

	bindingResource(): GPUBindingResource {
		return this.uniform.bindingResource();
	}

	updateUniform() {
		this.uniform.set('fadeout', this._fadeout);
		this.uniform.set('receiveShadows', this._receiveShadows);
		this.uniform.set('color', this._color);
		this.uniform.set('emissive', this._emissive);
	}
}
