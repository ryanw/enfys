import { Entity } from "engine/entity";
import { Pipeline } from ".";
import { SimpleMesh } from "engine/mesh";
import { Camera } from "engine/camera";
import { ShadowBuffer } from "engine/shadow_buffer";
import { GBuffer } from "engine/gbuffer";

export abstract class MaterialPipeline extends Pipeline {
	abstract drawBatch(encoder: GPUCommandEncoder, src: Array<Entity<SimpleMesh>>, camera: Camera, shadows: ShadowBuffer, target: GBuffer): void;

	draw(encoder: GPUCommandEncoder, src: Entity<SimpleMesh>, camera: Camera, shadows: ShadowBuffer, target: GBuffer): void {
		this.drawBatch(encoder, [src], camera, shadows, target);
	}
}
