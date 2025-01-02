import { Color, Gfx } from 'engine';
import { colorToBigInt, colorToInt } from 'engine/color';
import { Material } from 'engine/material';
import { UniformBuffer } from 'engine/uniform_buffer';

export class SkyMaterial extends Material {
	readonly uniform: UniformBuffer;
	readonly colors: GPUTexture;

	constructor(
		readonly gfx: Gfx,
		readonly seed: number,
		colors: Array<Color | number> | GPUTexture,
	) {
		super();
		if (colors instanceof GPUTexture) {
			this.colors = colors;
		}
		else {
			const colorCount = colors.length;
			this.colors = gfx.createTexture('rgba8unorm', [colorCount], "Sky Colours");

			const pixels = colors.map(colorToInt);

			gfx.device.queue.writeTexture(
				{ texture: this.colors },
				new Uint32Array(pixels),
				{},
				[colorCount],
			);
		}
		this.uniform = new UniformBuffer(gfx, [
			['seed', 'u32'],
		]);
		this.updateUniform();
	}

	updateUniform() {
		this.uniform.replace({
			seed: this.seed,
		});
	}

	bindingResource(): GPUBindingResource {
		return this.uniform.bindingResource();
	}
}

