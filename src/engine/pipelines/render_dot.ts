import { Gfx } from 'engine';
import shaderSource from './render_dot.wgsl';
import { Camera } from 'engine/camera';
import { GBuffer } from 'engine/gbuffer';
import { SimpleMesh } from 'engine/mesh';
import { ShadowBuffer } from 'engine/shadow_buffer';
import { Entity } from 'engine/entity';
import { MaterialPipeline } from './material';

/**
 * Render Pipeline to draw {@link SimpleMesh} instances using the {@link DotMaterial} to a {@link GBuffer}
 */
export class RenderDotPipeline extends MaterialPipeline {
	private pipeline: GPURenderPipeline;
	private pipelineNoDepth: GPURenderPipeline;

	constructor(gfx: Gfx) {
		super(gfx);

		const { device } = gfx;

		const shader = device.createShaderModule({ label: 'RenderDotPipeline Shader', code: shaderSource });

		const cameraBindGroupLayout = device.createBindGroupLayout({
			entries: [
				// Camera
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
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
					visibility: GPUShaderStage.FRAGMENT,
					buffer: {}
				},
			]
		});
		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [cameraBindGroupLayout],
		});

		const pipelineDescriptor: GPURenderPipelineDescriptor = {
			label: 'RenderDotPipeline',
			layout: pipelineLayout,
			vertex: { module: shader, entryPoint: 'vs_main', buffers: [pointVertexLayout, offsetInstanceLayout] },
			fragment: {
				module: shader,
				entryPoint: 'fs_main',
				targets: [
					// Albedo output
					{ format: 'rgba8unorm' },
					// Normal output
					{ format: 'rgba16float' },
					// Meta output
					{ format: 'r8uint' },
				]
			},
			primitive: { topology: 'triangle-list', frontFace: 'cw', cullMode: 'back', },
			depthStencil: {
				format: 'depth24plus',
				depthWriteEnabled: true,
				depthCompare: 'less',
			}
		};
		this.pipeline = device.createRenderPipeline(pipelineDescriptor);

		this.pipelineNoDepth = device.createRenderPipeline({
			...pipelineDescriptor,
			depthStencil: {
				format: 'depth24plus',
				depthWriteEnabled: false,
				depthCompare: 'less',
			}
		});
	}

	override draw(encoder: GPUCommandEncoder, src: Entity<SimpleMesh>, camera: Camera, shadows: ShadowBuffer, target: GBuffer) {
		if (src.object.vertexCount === 0 || src.object.instanceCount === 0) {
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
			depthStencilAttachment: src.material.writeDepth
				? { view: depthView, depthLoadOp: 'load', depthStoreOp: 'store' }
				: { view: depthView, depthReadOnly: true }
		};

		const bindGroup = device.createBindGroup({
			label: 'RenderDotPipeline Pass 1 Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: camera.uniform.bindingResource() },
				{ binding: 1, resource: src.bindingResource() },
				{ binding: 2, resource: src.material.bindingResource() },
			],
		});


		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(src.material.writeDepth ? this.pipeline : this.pipelineNoDepth);
		pass.setVertexBuffer(0, src.object.vertexBuffer);
		pass.setVertexBuffer(1, src.object.instanceBuffer);
		pass.setBindGroup(0, bindGroup);
		pass.draw(src.object.vertexCount, src.object.instanceCount);
		pass.end();
	}
}

const pointVertexLayout: GPUVertexBufferLayout = {
	stepMode: 'vertex',
	attributes: [{
		// Position
		shaderLocation: 0,
		offset: 0,
		format: 'float32x3'
	}, {
		// Normal
		shaderLocation: 1,
		offset: 12,
		format: 'float32x3'
	}, {
		// Color
		shaderLocation: 2,
		offset: 24,
		format: 'float32x4'
	}],
	arrayStride: 40,
};

const offsetInstanceLayout: GPUVertexBufferLayout = {
	stepMode: 'instance',
	attributes: [{
		// Offset
		shaderLocation: 3,
		offset: 0,
		format: 'float32x3'
	}],
	arrayStride: 12,
};
