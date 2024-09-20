import { Pawn } from 'engine/pawn';
import { Pipeline } from '.';
import { Mesh, SimpleMesh, Vertex } from 'engine/mesh';
import { Camera } from 'engine/camera';
import { GBuffer } from 'engine/gbuffer';
import { ShadowMap } from 'engine/shadow_map';
import { DirectionalLight } from 'engine/light';

export abstract class MaterialPipeline<V extends Vertex<V> = any, I extends Vertex<I> = any, M extends Mesh<V, I> = any> extends Pipeline {
	abstract drawBatch(encoder: GPUCommandEncoder, src: Array<Pawn<M>>, camera: Camera, target: GBuffer): void;
	abstract drawShadowMapBatch(encoder: GPUCommandEncoder, src: Array<Pawn<M>>, light: DirectionalLight, target: ShadowMap): void;

	draw(encoder: GPUCommandEncoder, src: Pawn<M>, camera: Camera, target: GBuffer): void {
		this.drawBatch(encoder, [src], camera, target);
	}

	drawShadowMap(encoder: GPUCommandEncoder, src: Pawn<M>, light: DirectionalLight, target: ShadowMap): void {
		this.drawShadowMapBatch(encoder, [src], light, target);
	}
}
