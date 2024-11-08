import { Gfx } from 'engine';
import defaultSource from './render_planet.wgsl';
import { Camera } from 'engine/camera';
import { GBuffer } from 'engine/gbuffer';
import { SimpleMesh } from 'engine/mesh';
import { Pawn } from 'engine/pawn';
import { ShadowMap } from 'engine/shadow_map';
import { DirectionalLight } from 'engine/light';
import { MaterialPipeline } from 'engine/pipelines/material';

export class BasePipeline extends MaterialPipeline {
	protected pipeline: GPURenderPipeline;
	protected pipelineShadowMap: GPURenderPipeline;
	protected pipelineNoDepth: GPURenderPipeline;
	protected name: string;

	constructor(gfx: Gfx, source?: string) {
		super(gfx);
		this.name = Object.getPrototypeOf(this).constructor.name;

		const { device } = gfx;

		const shader = device.createShaderModule({
			label: `${this.name} Shader`,
			code: source || defaultSource
		});

		const cameraBindGroupLayout = device.createBindGroupLayout({
			label: `${this.name} Bind Group Layout`,
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
			]
		});
		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [cameraBindGroupLayout],
		});

		const pipelineDescriptor: GPURenderPipelineDescriptor = {
			label: `${this.name} Pipeline`,
			layout: pipelineLayout,
			vertex: {
				module: shader,
				entryPoint: 'vs_main',
				buffers: [offsetInstanceLayout]
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
			primitive: { topology: 'triangle-list', frontFace: 'cw', cullMode: 'back', },
			depthStencil: {
				format: 'depth32float',
				depthWriteEnabled: true,
				depthCompare: 'less',
			}
		};
		this.pipeline = device.createRenderPipeline(pipelineDescriptor);

		this.pipelineNoDepth = device.createRenderPipeline({
			...pipelineDescriptor,
			depthStencil: {
				format: 'depth32float',
				depthWriteEnabled: false,
				depthCompare: 'less',
			}
		});

		const pipelineShadowDescriptor: GPURenderPipelineDescriptor = {
			label: `${this.name} ShadowMap`,
			layout: pipelineLayout,
			vertex: {
				module: shader,
				entryPoint: 'vs_main',
				buffers: [offsetInstanceLayout],
			},
			fragment: {
				module: shader,
				entryPoint: 'fs_main',
				targets: [
					// No targets other than depth
				]
			},
			primitive: { topology: 'triangle-list', frontFace: 'cw', cullMode: 'front', },
			depthStencil: {
				format: 'depth32float',
				depthWriteEnabled: true,
				depthCompare: 'less',
			}
		};
		this.pipelineShadowMap = device.createRenderPipeline(pipelineShadowDescriptor);
	}

	drawShadowMapBatch(encoder: GPUCommandEncoder, pawns: Array<Pawn<SimpleMesh>>, light: DirectionalLight, target: ShadowMap) {
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
		// FIXME assumes all entities use same material
		const writeDepth = pawns[0].material.writeDepth;

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
			depthStencilAttachment: writeDepth
				? { view: depthView, depthLoadOp: 'load', depthStoreOp: 'store' }
				: { view: depthView, depthReadOnly: true }
		};

		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(writeDepth ? this.pipeline : this.pipelineNoDepth);

		for (const pawn of pawns) {
			if (!pawn.visible || pawn.object.vertexCount === 0 || pawn.object.instanceCount === 0) {
				continue;
			}
			const bindGroup = device.createBindGroup({
				label: `${this.name} Pass Bind Group`,
				layout: this.pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 0, resource: camera.uniform.bindingResource() },
					{ binding: 1, resource: pawn.bindingResource() },
					{ binding: 2, resource: pawn.material.bindingResource() },
					{ binding: 3, resource: { buffer: pawn.object.vertexBuffer } },
				],
			});
			pass.setBindGroup(0, bindGroup);
			pass.setVertexBuffer(0, pawn.object.instanceBuffer);
			pass.draw(pawn.object.vertexCount, pawn.object.instanceCount);
		}
		pass.end();
	}
}

// FIXME standardise this between material pipelines
const offsetInstanceLayout: GPUVertexBufferLayout = {
	stepMode: 'instance',
	attributes: [
		// Transform
		{ shaderLocation: 3, offset: 0, format: 'float32x4' },
		{ shaderLocation: 4, offset: 16, format: 'float32x4' },
		{ shaderLocation: 5, offset: 32, format: 'float32x4' },
		{ shaderLocation: 6, offset: 48, format: 'float32x4' },
		// Instance Color
		{ shaderLocation: 7, offset: 64, format: 'uint32' },
		// Vertex Index
		{ shaderLocation: 8, offset: 68, format: 'uint32' },
		// Live
		{ shaderLocation: 9, offset: 72, format: 'uint32' },
	],
	arrayStride: 76,
};


