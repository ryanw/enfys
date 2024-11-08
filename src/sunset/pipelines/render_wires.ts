import { Gfx } from 'engine';
import { BasePipeline } from './base';
import renderWiresSource from './render_wires.wgsl';

export class RenderWiresPipeline extends BasePipeline {
	constructor(gfx: Gfx, source?: string) {
		super(gfx, source || renderWiresSource);
	}
}
