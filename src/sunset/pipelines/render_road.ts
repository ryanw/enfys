import { Gfx } from 'engine';
import { BasePipeline } from './base';
import renderRoadSource from './render_road.wgsl';

export class RenderRoadPipeline extends BasePipeline {
	constructor(gfx: Gfx, source?: string) {
		super(gfx, source || renderRoadSource);
	}
}
