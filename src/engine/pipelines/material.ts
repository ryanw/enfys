import { Entity } from "engine/entity";
import { Pipeline } from ".";
import { SimpleMesh } from "engine/mesh";
import { Camera } from "engine/camera";
import { ShadowBuffer } from "engine/shadow_buffer";
import { GBuffer } from "engine/gbuffer";

export class MaterialPipeline extends Pipeline {

	draw(encoder: GPUCommandEncoder, src: Entity<SimpleMesh>, camera: Camera, shadows: ShadowBuffer, target: GBuffer) {
	}
}


