import { Color, Constructor, Gfx } from 'engine';
import { Scene } from './scene';
import { ComposePipeline } from './pipelines/compose';
import { RenderMeshPipeline } from './pipelines/render_mesh';
import { Camera } from './camera';
import { GBuffer } from './gbuffer';
import { SimpleMesh } from './mesh';
import { Point3 } from './math';
import { isEntityOf } from './entity';
import { DotMaterial, Material, SimpleMaterial } from './material';
import { MaterialPipeline } from './pipelines/material';
import { RenderDotPipeline } from './pipelines/render_dot';


export interface RenderPipelines {
	compose: ComposePipeline,
	materials: Map<Constructor<Material>, MaterialPipeline>,
}

export class Renderer {
	pipelines: RenderPipelines;

	constructor(readonly gfx: Gfx) {
		this.pipelines = {
			compose: new ComposePipeline(gfx),
			materials: new Map()
		};
		this.registerMaterial(SimpleMaterial, new RenderMeshPipeline(gfx));
		this.registerMaterial(DotMaterial, new RenderDotPipeline(gfx));
	}

	registerMaterial<M extends Material, P extends MaterialPipeline>(material: Constructor<M>, pipeline: P) {
		this.pipelines.materials.set(material, pipeline);
	}

	getMaterialPipeline<M extends Material>(material: M): MaterialPipeline | undefined {
		let constructor = material.constructor;
		while (constructor != null) {
			const pipeline = this.pipelines.materials.get(constructor as Constructor<SimpleMaterial>);
			if (pipeline) {
				return pipeline;
			}
			constructor = Object.getPrototypeOf(constructor);
		}
		console.error("Failed to find pipeline for", material);
	}

	drawScene(encoder: GPUCommandEncoder, scene: Scene, camera: Camera, target: GBuffer) {
		const [w, h] = target.size;
		camera.aspect = w / h;
		this.clear(encoder, target);
		for (const entity of scene.entities) {
			if (isEntityOf(entity, SimpleMesh)) {
				const pipeline = this.getMaterialPipeline(entity.material);

				if (!pipeline) {
					continue;
				}
				if (entity.material.writeDepth) {
					pipeline.draw(encoder, entity, camera, scene.shadowBuffer, target);
				}
			}
		}
		for (const entity of scene.entities) {
			if (isEntityOf(entity, SimpleMesh)) {
				const pipeline = this.getMaterialPipeline(entity.material);
				if (!pipeline) {
					continue;
				}
				if (!entity.material.writeDepth) {
					pipeline.draw(encoder, entity, camera, scene.shadowBuffer, target);
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
