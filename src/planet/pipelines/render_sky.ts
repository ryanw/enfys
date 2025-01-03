import { Gfx } from 'engine';
import renderSource from './render_sky.wgsl';
import { Camera } from 'engine/camera';
import { SimpleMesh } from 'engine/mesh';
import { Pawn } from 'engine/pawn';
import { MaterialPipeline } from 'engine/pipelines/material';
import { GBuffer } from 'engine/gbuffer';
import { SkyMaterial } from '../materials/sky';
import { meshInstanceLayout } from 'engine/pipelines/render_mesh';

export class RenderSkyPipeline extends MaterialPipeline {
	private pipeline!: GPURenderPipeline;
	private sampler!: GPUSampler;

	constructor(gfx: Gfx) {
		super(gfx);

		this.buildRenderPipeline();
	}

	buildRenderPipeline() {
		const { device } = this.gfx;

		const shader = device.createShaderModule({
			label: 'RenderSkyPipeline Shader',
			code: renderSource
		});

		const cameraBindGroupLayout = device.createBindGroupLayout({
			label: 'RenderSkyPipeline Bind Group Layout',
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
				// Vertices
				{
					binding: 3,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: {
						type: 'read-only-storage',
					}
				},
				// Colour texture buffer
				{
					binding: 4,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					texture: {
						sampleType: 'float',
						viewDimension: '1d'
					}
				},
				{
					binding: 5,
					visibility: GPUShaderStage.FRAGMENT,
					sampler: {}
				},
			]
		});
		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [cameraBindGroupLayout],
		});

		const pipelineDescriptor: GPURenderPipelineDescriptor = {
			label: 'RenderSkyPipeline',
			layout: pipelineLayout,
			vertex: {
				module: shader,
				entryPoint: 'vs_main',
				buffers: [meshInstanceLayout]
			},
			fragment: {
				module: shader,
				entryPoint: 'fs_main',
				targets: [
					// Albedo output
					{
						format: 'rgba16float', blend: {
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
			primitive: { topology: 'triangle-list', frontFace: 'cw', cullMode: 'back' },
			depthStencil: {
				format: 'depth32float',
				depthWriteEnabled: true,
				depthCompare: 'less',
			}
		};
		this.pipeline = device.createRenderPipeline(pipelineDescriptor);
		this.sampler = device.createSampler({
			addressModeU: 'repeat',
			addressModeV: 'repeat',
			addressModeW: 'repeat',
			magFilter: 'nearest',
			minFilter: 'nearest',
			mipmapFilter: 'nearest',
			lodMinClamp: 0,
			lodMaxClamp: 1000,
			maxAnisotropy: 1,
		});
	}

	drawBatch(encoder: GPUCommandEncoder, pawns: Array<Pawn<SimpleMesh>>, camera: Camera, target: GBuffer) {
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
			depthStencilAttachment: {
				view: depthView,
				depthLoadOp: 'load',
				depthStoreOp: 'store'
			}
		};

		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipeline);

		for (const pawn of pawns) {
			if (!pawn.visible || pawn.object.vertexCount === 0 || pawn.object.instanceCount === 0) {
				continue;
			}
			const bindGroup = device.createBindGroup({
				label: 'RenderPlanetPipeline Pass Bind Group',
				layout: this.pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 0, resource: camera.uniform.bindingResource() },
					{ binding: 1, resource: pawn.bindingResource() },
					{ binding: 2, resource: pawn.material.bindingResource() },
					{ binding: 3, resource: { buffer: pawn.object.vertexBuffer } },
					{ binding: 4, resource: (pawn.material as SkyMaterial).colors.createView({
						dimension: '1d'
					}) },
					{ binding: 5, resource: this.sampler },
				],
			});
			pass.setBindGroup(0, bindGroup);
			pass.setVertexBuffer(0, pawn.object.instanceBuffer);
			pass.draw(pawn.object.vertexCount, pawn.object.instanceCount);
		}
		pass.end();
	}
}
