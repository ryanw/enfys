import { Color, Gfx } from 'engine';
import { UniformBuffer } from './uniform_buffer';

/**
 * Material stored in a {@link GPUBuffer}
 */
export class Material {
	readonly uniform: UniformBuffer;
	private _color: Color;

	constructor(
		readonly gfx: Gfx,
		color: Color = [255, 255, 255, 255],
		public dither: boolean = false,
	) {
		this._color = color;
		this.uniform = new UniformBuffer(gfx, [
			['color', 'vec4f'],
			['dither', 'u32'],
		]);
		this.updateUniform();
	}

	get color() {
		return [...this._color];
	}

	set color(color: Color) {
		this._color = color;
		this.updateUniform();
	}

	bindingResource(): GPUBindingResource {
		return this.uniform.bindingResource();
	}

	updateUniform() {
		this.uniform.set('color', this._color.map(v => v/255));
	}
}
