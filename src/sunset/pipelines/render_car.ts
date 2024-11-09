import { Gfx } from 'engine';
import { BasePipeline } from './base';
import renderCarSource from './render_car.wgsl';

export class RenderCarPipeline extends BasePipeline {
	constructor(gfx: Gfx, source?: string) {
		super(gfx, source || renderCarSource);
	}
}
