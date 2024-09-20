import { Gfx } from 'engine';
import defaultSource from './render_sprite.wgsl';
import { Camera } from 'engine/camera';
import { GBuffer } from 'engine/gbuffer';
import { Mesh } from 'engine/mesh';
import { Pawn } from 'engine/pawn';
import { MaterialPipeline } from './material';
import { Point2, Point3 } from 'engine/math';
import { DirectionalLight } from 'engine/light';
import { ShadowMap } from 'engine/shadow_map';
import { SpriteMaterial } from 'engine/material';

export interface SpriteVertex {
	position: Point3;
	uv: Point2;
}

export interface SpriteInstance {
	region: [number, number, number, number];
	translation: Point2;
	rotation: Point2;
}

/**
 * Instanced Mesh made of {@link ColorVertex} vertices
 */
export class SpriteMesh extends Mesh<SpriteVertex, SpriteInstance> {
	vertexOrder: Array<keyof SpriteVertex> = ['position', 'uv'];
	instanceOrder: Array<keyof SpriteInstance> = ['region', 'translation', 'rotation'];
	constructor(gfx: Gfx, vertices: Array<SpriteVertex> = [], instances?: Array<SpriteInstance>) {
		super(gfx);
		this.uploadVertices(vertices);
		if (instances) {
			this.uploadInstances(instances);
		}
		else {
			this.uploadInstances([{
				region: [0, 0, 0, 0],
				translation: [0, 0],
				rotation: [0, 0]
			}]);
		}
	}
}

/**
 * Render Pipeline to draw {@link SpriteMesh} instances using the {@link SpriteMaterial} to a {@link GBuffer}
 */
export class RenderSpritePipeline extends MaterialPipeline<SpriteVertex, SpriteInstance, SpriteMesh> {
	private pipeline: GPURenderPipeline;
	private sampler: GPUSampler;

	constructor(gfx: Gfx, source?: string) {
		super(gfx);

		const { device } = gfx;

		const shader = device.createShaderModule({ label: 'RenderSpritePipeline Shader', code: source || defaultSource });

		this.sampler = device.createSampler({
			addressModeU: 'clamp-to-edge',
			addressModeV: 'clamp-to-edge',
			addressModeW: 'clamp-to-edge',
			magFilter: 'nearest',
			minFilter: 'linear',
			mipmapFilter: 'linear',
			lodMinClamp: 0,
			lodMaxClamp: 1000,
			maxAnisotropy: 1,
		});
		const cameraBindGroupLayout = device.createBindGroupLayout({
			label: 'RenderSpritePipeline Bind Group Layout',
			entries: [
				// Camera
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: {}
				},
				// Entity
				{
					binding: 1,
					visibility: GPUShaderStage.VERTEX,
					buffer: {}
				},
				// Material
				{
					binding: 2,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: {}
				},
				// Sampler
				{
					binding: 3,
					visibility: GPUShaderStage.FRAGMENT,
					sampler: {}
				},
				// Texture
				{
					binding: 4,
					visibility: GPUShaderStage.FRAGMENT,
					texture: {}
				},
			]
		});
		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [cameraBindGroupLayout],
		});

		const pipelineDescriptor: GPURenderPipelineDescriptor = {
			label: 'RenderSpritePipeline',
			layout: pipelineLayout,
			vertex: {
				module: shader,
				entryPoint: 'vs_main',
				buffers: [vertexLayout, instanceLayout]
			},
			fragment: {
				module: shader,
				entryPoint: 'fs_main',
				targets: [
					// Albedo output
					{
						format: 'rgba8unorm', blend: {
							alpha: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
							color: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
						}
					},
					// Normal output
					{
						format: 'rgba16float', blend: {
							alpha: { operation: 'add', srcFactor: 'one', dstFactor: 'zero' },
							color: { operation: 'add', srcFactor: 'one', dstFactor: 'zero' },
						}
					},
					// Meta output
					{ format: 'r8uint' },
				]
			},
			primitive: { topology: 'triangle-list', frontFace: 'cw', cullMode: 'none', },
			depthStencil: {
				format: 'depth32float',
				depthWriteEnabled: true,
				depthCompare: 'less',
			}
		};
		this.pipeline = device.createRenderPipeline(pipelineDescriptor);

	}

	override drawBatch(encoder: GPUCommandEncoder, pawns: Array<Pawn<SpriteMesh>>, camera: Camera, target: GBuffer) {
		if (pawns.length === 0) {
			return;
		}
		const { device } = this.gfx;

		const albedoView = target.albedo.createView();
		const normalView = target.normal.createView();
		const metaView = target.meta.createView();
		const depthView = target.depth.createView();

		const baseAttachment: Omit<GPURenderPassColorAttachment, 'view'> = {
			clearValue: [0, 0, 0, 0],
			loadOp: 'load',
			storeOp: 'store',
		};

		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{ view: albedoView, ...baseAttachment },
				{ view: normalView, ...baseAttachment },
				{ view: metaView, ...baseAttachment },
			],
			depthStencilAttachment: { view: depthView, depthLoadOp: 'load', depthStoreOp: 'store' }
		};

		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipeline);

		for (const pawn of pawns) {
			if (!pawn.visible || pawn.object.vertexCount === 0 || pawn.object.instanceCount === 0) {
				continue;
			}
			const bindGroup = device.createBindGroup({
				label: 'RenderSpritePipeline Pass Bind Group',
				layout: this.pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 0, resource: camera.uniform.bindingResource() },
					{ binding: 1, resource: pawn.bindingResource() },
					{ binding: 2, resource: pawn.material.bindingResource() },
					{ binding: 3, resource: this.sampler },
					// FIXME types
					{ binding: 4, resource: (pawn.material as SpriteMaterial).texture.createView() },
				],
			});
			pass.setBindGroup(0, bindGroup);
			pass.setVertexBuffer(0, pawn.object.vertexBuffer);
			pass.setVertexBuffer(1, pawn.object.instanceBuffer);
			pass.draw(pawn.object.vertexCount, pawn.object.instanceCount);
		}
		pass.end();
	}

	override drawShadowMapBatch(encoder: GPUCommandEncoder, src: Array<Pawn<SpriteMesh>>, light: DirectionalLight, target: ShadowMap) {
	}
}

const vertexLayout: GPUVertexBufferLayout = {
	stepMode: 'vertex',
	attributes: [
		// Position
		{ shaderLocation: 0, offset: 0, format: 'float32x3' },
		// UV
		{ shaderLocation: 1, offset: 12, format: 'float32x2' },
	],
	arrayStride: 20,
};

const instanceLayout: GPUVertexBufferLayout = {
	stepMode: 'instance',
	attributes: [
		// Region
		{ shaderLocation: 2, offset: 0, format: 'float32x4' },
		// Translation
		{ shaderLocation: 3, offset: 16, format: 'float32x2' },
		// Rotation
		{ shaderLocation: 4, offset: 24, format: 'float32x2' },
	],
	arrayStride: 32,
};
