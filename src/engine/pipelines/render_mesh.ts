import { Gfx } from 'engine';
import { Pipeline } from './';
import shaderSource from './render_mesh.wgsl';
import { Entity } from 'engine/scene';
import { Camera } from 'engine/camera';
import { GBuffer } from 'engine/gbuffer';
import { SimpleMesh } from 'engine/mesh';

/**
 * Render Pipeline to draw {@link SimpleMesh} instances to a {@link GBuffer}
 */
export class RenderMeshPipeline extends Pipeline {
	private pipelinePass1: GPURenderPipeline;
	private pipelinePass2: GPURenderPipeline;

	constructor(gfx: Gfx) {
		super(gfx);

		const { device } = gfx;

		const shader = device.createShaderModule({ label: 'RenderMeshPipeline Shader', code: shaderSource });

		const cameraBindGroupLayout = device.createBindGroupLayout({
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
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: {}
				},
				// Material
				{
					binding: 2,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: {}
				},
			]
		});
		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [cameraBindGroupLayout],
		});

		this.pipelinePass1 = device.createRenderPipeline({
			label: 'RenderMeshPipeline Pass1',
			layout: pipelineLayout,
			vertex: { module: shader, entryPoint: 'vs_main', buffers: pointVertexLayout },
			fragment: {
				module: shader,
				entryPoint: 'fs_main_pass1',
				targets: [
					// Position output
					{ format: 'rgba32float' },
					// Albedo output
					{ format: 'rgba8unorm' },
					// Normal output
					{ format: 'rgba16float' },
				]
			},
			primitive: { topology: 'triangle-list', frontFace: 'cw', cullMode: 'back', },
			depthStencil: {
				format: 'depth24plus',
				depthWriteEnabled: true,
				depthCompare: 'less',
			}
		});

		this.pipelinePass2 = device.createRenderPipeline({
			label: 'RenderMeshPipeline Pass2',
			layout: pipelineLayout,
			vertex: { module: shader, entryPoint: 'vs_main', buffers: pointVertexLayout },
			fragment: {
				module: shader,
				entryPoint: 'fs_main_pass2',
				targets: [
					// Meta output
					{ format: 'r8uint' },
				]
			},
			primitive: { topology: 'triangle-list', frontFace: 'cw', cullMode: 'back', },
			depthStencil: {
				format: 'depth24plus',
				depthWriteEnabled: false,
				depthCompare: 'equal',
			}
		});
	}

	draw(encoder: GPUCommandEncoder, src: Entity<SimpleMesh>, camera: Camera, target: GBuffer) {
		this.drawPass1(encoder, src, camera, target);
		this.drawPass2(encoder, src, camera, target);
	}

	private drawPass1(encoder: GPUCommandEncoder, src: Entity<SimpleMesh>, camera: Camera, target: GBuffer) {
		const { device } = this.gfx;

		const positionView = target.position.createView();
		const albedoView = target.albedo.createView();
		const normalView = target.normal.createView();
		const depthView = target.depth.createView();

		const baseAttachment: Omit<GPURenderPassColorAttachment, 'view'> = {
			clearValue: [0, 0, 0, 0],
			loadOp: 'load',
			storeOp: 'store',
		};
		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{ view: positionView, ...baseAttachment },
				{ view: albedoView, ...baseAttachment },
				{ view: normalView, ...baseAttachment },
			],
			depthStencilAttachment: {
				view: depthView,
				depthClearValue: 1.0,
				depthLoadOp: 'load',
				depthStoreOp: 'store',
			}
		};

		const bindGroup = device.createBindGroup({
			label: 'RenderMeshPipeline Pass 1 Bind Group',
			layout: this.pipelinePass1.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: camera.uniform.bindingResource() },
				{ binding: 1, resource: src.bindingResource() },
				{ binding: 2, resource: src.material.bindingResource() },
			],
		});


		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipelinePass1);
		pass.setVertexBuffer(0, src.object.buffer);
		pass.setBindGroup(0, bindGroup);
		pass.draw(src.object.vertexCount);
		pass.end();
	}

	private drawPass2(encoder: GPUCommandEncoder, src: Entity<SimpleMesh>, camera: Camera, target: GBuffer) {
		const { device } = this.gfx;

		const metaView = target.meta.createView();
		const depthView = target.depth.createView();

		const baseAttachment: Omit<GPURenderPassColorAttachment, 'view'> = {
			clearValue: [0, 0, 0, 0],
			loadOp: 'load',
			storeOp: 'store',
		};
		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{ view: metaView, ...baseAttachment },
			],
			depthStencilAttachment: {
				view: depthView,
				depthClearValue: 1.0,
				depthLoadOp: 'load',
				depthStoreOp: 'store',
			}
		};

		const bindGroup = device.createBindGroup({
			label: 'RenderMeshPipeline Pass 2 Bind Group',
			layout: this.pipelinePass2.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: camera.uniform.bindingResource() },
				{ binding: 1, resource: src.bindingResource() },
				{ binding: 2, resource: src.material.bindingResource() },
			],
		});


		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipelinePass2);
		pass.setVertexBuffer(0, src.object.buffer);
		pass.setBindGroup(0, bindGroup);
		pass.draw(src.object.vertexCount);
		pass.end();
	}
}

const pointVertexLayout: Array<GPUVertexBufferLayout> = [{
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
		// UV
		shaderLocation: 2,
		offset: 24,
		format: 'float32x2'
	}],
	arrayStride: 32,
}];
