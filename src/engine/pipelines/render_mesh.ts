import { GBuffer, Gfx } from 'engine';
import Pipeline from '../pipeline';
import shaderSource from './render_mesh.wgsl';
import { SimpleMesh } from 'engine/scene';
import { Camera } from 'engine/camera';
import { identity, multiply, rotation, translation } from 'engine/math/transform';

const pointVertexLayout: Array<GPUVertexBufferLayout> = [{
	attributes: [{
		// Position
		shaderLocation: 0,
		offset: 0,
		format: 'float32x3'
	},{
		// Normal
		shaderLocation: 1,
		offset: 12,
		format: 'float32x3'
	},{
		// UV
		shaderLocation: 2,
		offset: 24,
		format: 'float32x2'
	}],
	arrayStride: 32,
}];

/**
 * Pipeline to render Meshes to a GBuffer
 */
export default class RenderMeshPipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	// FIXME replace with ring buffers
	private cameraBuffer: GPUBuffer;
	private entityBuffer: GPUBuffer;

	constructor(gfx: Gfx) {
		super(gfx);

		const { device } = gfx;

		const shader = device.createShaderModule({ label: 'RenderMeshPipeline Shader', code: shaderSource });

		const cameraBindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: {}
				},
				{
					binding: 1,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: {}
				},
			]
		});
		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [cameraBindGroupLayout],
		});

		this.pipeline = device.createRenderPipeline({
			label: 'RenderMeshPipeline',
			layout: pipelineLayout,
			vertex: { module: shader, entryPoint: 'vs_main', buffers: pointVertexLayout },
			fragment: { module: shader, entryPoint: 'fs_main', targets: [{ format: 'rgba8unorm' }] },
			primitive: { topology: 'triangle-list', frontFace: 'cw', cullMode: 'back', },
		});

		this.cameraBuffer = device.createBuffer({
			size: 256,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		this.entityBuffer = device.createBuffer({
			size: 256,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
	}

	draw(encoder: GPUCommandEncoder, src: SimpleMesh, camera: Camera, target: GBuffer) {
		const { device } = this.gfx;

		const view = target.albedo.createView();
		device.queue.writeBuffer(this.cameraBuffer, 0, new Float32Array([
			// struct Camera
			...camera.view,
			...camera.projection,
			...target.size,
			performance.now() / 1000.0,
		]));
		// FIXME source from mesh
		const model = rotation(performance.now() / 3000.0, performance.now() / 2000.0, 0);
		device.queue.writeBuffer(this.entityBuffer, 0, new Float32Array(model));

		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{
					view,
					clearValue: { r: 1.0, g: 0.0, b: 0.0, a: 1.0 },
					loadOp: 'load',
					storeOp: 'store',
				},
			],
		};

		const bindGroup = device.createBindGroup({
			label: 'RenderMeshPipeline Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.cameraBuffer } },
				{ binding: 1, resource: { buffer: this.entityBuffer } },
			],
		});


		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipeline);
		pass.setVertexBuffer(0, src.buffer);
		pass.setBindGroup(0, bindGroup);
		pass.draw(src.count);
		pass.end();
	}
}

