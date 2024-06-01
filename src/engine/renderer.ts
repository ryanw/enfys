import { Color, Gfx } from 'engine';
import { Scene, isEntityOf } from './scene';
import { ComposePipeline } from './pipelines/compose';
import { RenderMeshPipeline } from './pipelines/render_mesh';
import { Camera } from './camera';
import { GBuffer } from './gbuffer';
import { SimpleMesh } from './mesh';
import { Point3 } from './math';

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
		for (const entity of scene.entities) {
			if (isEntityOf(entity, SimpleMesh)) {
				if (entity.material.writeDepth) {
					this.pipelines.mesh.draw(encoder, entity, camera, scene.shadowBuffer, target);
				}
			}
		}
		for (const entity of scene.entities) {
			if (isEntityOf(entity, SimpleMesh)) {
				if (!entity.material.writeDepth) {
					this.pipelines.mesh.draw(encoder, entity, camera, scene.shadowBuffer, target);
				}
			}
		}
	}

	compose(encoder: GPUCommandEncoder, src: GBuffer, camera: Camera, light: Point3, target: GPUTexture, clear?: Color) {
		this.pipelines.compose.compose(encoder, src, camera, light, target, clear);
	}

	clear(encoder: GPUCommandEncoder, target: GBuffer) {
		const clearValue = { r: 0, g: 0, b: 0, a: 0 };
		const albedoView = target.albedo.createView();
		const normalView = target.normal.createView();
		const metaView = target.meta.createView();
		const depthView = target.depth.createView();

		encoder.beginRenderPass({
			colorAttachments: [
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
				{
					view: metaView,
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

