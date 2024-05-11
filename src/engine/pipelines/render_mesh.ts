import { GBuffer, Gfx } from 'engine';
import Pipeline from '../pipeline';
import shaderSource from './render_mesh.wgsl';
import { SimpleMesh } from 'engine/scene';

const pointVertexLayout: Array<GPUVertexBufferLayout> = [{
	attributes: [{
		shaderLocation: 0,
		offset: 0,
		format: 'float32x4'
	}],
	arrayStride: 16,
}];

/**
 * Pipeline to render Meshes to a GBuffer
 */
export default class RenderMeshPipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private uniformBuffer: GPUBuffer;

	constructor(gfx: Gfx) {
		super(gfx);

		const { device } = gfx;

		const shader = device.createShaderModule({ label: 'RenderMeshPipeline Shader', code: shaderSource });

		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
					buffer: {}
				},
			]
		});
		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [bindGroupLayout],
		});

		this.pipeline = device.createRenderPipeline({
			label: 'RenderMeshPipeline',
			layout: pipelineLayout,
			vertex: { module: shader, entryPoint: 'vs_main', buffers: pointVertexLayout },
			fragment: { module: shader, entryPoint: 'fs_main', targets: [{ format: 'rgba8unorm' }] },
			primitive: { topology: 'triangle-strip' },
		});

		this.uniformBuffer = device.createBuffer({
			size: 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
	}

	draw(encoder: GPUCommandEncoder, src: SimpleMesh, target: GBuffer) {
		const { device } = this.gfx;

		const view = target.albedo.createView();
		device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([performance.now() / 1000.0]));

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
				{ binding: 0, resource: { buffer: this.uniformBuffer } },
			],
		});


		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipeline);
		pass.setVertexBuffer(0, src.buffer);
		pass.setBindGroup(0, bindGroup);
		pass.draw(src.count, 1, 0, 0);
		pass.end();
	}
}

