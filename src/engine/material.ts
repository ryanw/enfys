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
	private _color: Color;
	private _receiveShadows = false;
	private _emissive: boolean = false;

	constructor(
		readonly gfx: Gfx,
		color: Color = [255, 255, 255, 255],
		public dither: boolean = false,
	) {
		super();
		this._color = color;
		this.uniform = new UniformBuffer(gfx, [
			['color', 'vec4f'],
			['dither', 'u32'],
			['emissive', 'u32'],
			['receiveShadows', 'u32'],
		]);
		this.updateUniform();
	}

	get receiveShadows(): boolean {
		return this._receiveShadows;
	}

	set receiveShadows(flag: boolean) {
		this._receiveShadows = flag;
		this.updateUniform();
	}

	get color(): Color {
		return [...this._color];
	}

	set color(color: Color) {
		this._color = color;
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
		this.uniform.set('receiveShadows', this._receiveShadows);
		this.uniform.set('color', this._color.map(v => v/255));
		this.uniform.set('emissive', this._emissive);
	}
}
