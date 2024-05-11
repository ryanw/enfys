import { Color, GBuffer, Gfx } from "engine";
import Scene from "./scene";
import ComposePipeline from "./pipelines/compose";
import RenderMeshPipeline from "./pipelines/render_mesh";

export interface RenderPipelines {
	compose: ComposePipeline,
	mesh: RenderMeshPipeline,
}

export default class Renderer {
	pipelines: RenderPipelines;

	constructor(readonly gfx: Gfx) {
		this.pipelines = createRenderPipelines(gfx);
	}

	drawScene(encoder: GPUCommandEncoder, scene: Scene, target: GBuffer) {
		this.clear(encoder, scene.clearColor, target);
		for (const mesh of scene.meshes) {
			this.pipelines.mesh.draw(encoder, mesh, target)
		}
	}

	clear(encoder: GPUCommandEncoder, color: Color, target: GBuffer) {
		const [r, g, b, a] = color.map(v => v / 255.0);
		const clearValue = { r, g, b, a };
		const albedoView = target.albedo.createView();
		const depthView = target.depth.createView();

		encoder.beginRenderPass({
			colorAttachments: [{
				view: albedoView,
				clearValue,
				loadOp: 'clear',
				storeOp: 'store',
			}],
			depthStencilAttachment: {
				view: depthView,
				depthClearValue: 1.0,
				depthLoadOp: 'clear',
				depthStoreOp: 'store',
			}
		}).end();
	}

}
function createRenderPipelines(gfx: Gfx): RenderPipelines {
	return {
		compose: new ComposePipeline(gfx),
		mesh: new RenderMeshPipeline(gfx),
	};
}

