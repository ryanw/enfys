import { Color, Gfx } from 'engine';
import { Scene } from './scene';
import { ComposePipeline } from './pipelines/compose';
import { RenderMeshPipeline } from './pipelines/render_mesh';
import { Camera } from './camera';
import { GBuffer } from './gbuffer';

export interface RenderPipelines {
	compose: ComposePipeline,
	mesh: RenderMeshPipeline,
}

export class Renderer {
	pipelines: RenderPipelines;

	constructor(readonly gfx: Gfx) {
		this.pipelines = createRenderPipelines(gfx);
	}

	drawScene(encoder: GPUCommandEncoder, scene: Scene, camera: Camera, target: GBuffer) {
		const [w, h] = target.size;
		camera.aspect = w / h;
		this.clear(encoder, target);
		for (const mesh of scene.meshes) {
			this.pipelines.mesh.draw(encoder, mesh, camera, target);
		}
	}

	compose(encoder: GPUCommandEncoder, src: GBuffer, target: GPUTexture, clear?: Color) {
		this.pipelines.compose.compose(encoder, src, target, clear);
	}

	clear(encoder: GPUCommandEncoder, target: GBuffer) {
		const clearValue = { r: 0, g: 0, b: 0, a: 0 };
		const positionView = target.position.createView();
		const albedoView = target.albedo.createView();
		const normalView = target.normal.createView();
		const depthView = target.depth.createView();

		encoder.beginRenderPass({
			colorAttachments: [
				{
					view: positionView,
					clearValue,
					loadOp: 'clear',
					storeOp: 'store',
				},
				{
					view: albedoView,
					clearValue,
					loadOp: 'clear',
					storeOp: 'store',
				},
				{
					view: normalView,
					clearValue,
					loadOp: 'clear',
					storeOp: 'store',
				},
			],
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

