import { Pawn } from "engine/pawn";
import { Pipeline } from ".";
import { SimpleMesh } from "engine/mesh";
import { Camera } from "engine/camera";
import { GBuffer } from "engine/gbuffer";
import { ShadowMap } from "engine/shadow_map";
import { DirectionalLight } from "engine/light";

export abstract class MaterialPipeline extends Pipeline {
	abstract drawBatch(encoder: GPUCommandEncoder, src: Array<Pawn<SimpleMesh>>, camera: Camera, target: GBuffer): void;
	abstract drawShadowMapBatch(encoder: GPUCommandEncoder, src: Array<Pawn<SimpleMesh>>, light: DirectionalLight, target: ShadowMap): void;

	draw(encoder: GPUCommandEncoder, src: Pawn<SimpleMesh>, camera: Camera, target: GBuffer): void {
		this.drawBatch(encoder, [src], camera, target);
	}

	drawShadowMap(encoder: GPUCommandEncoder, src: Pawn<SimpleMesh>, light: DirectionalLight, target: ShadowMap): void {
		this.drawShadowMapBatch(encoder, [src], light, target);
	}
}
