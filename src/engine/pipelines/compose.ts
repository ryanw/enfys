import { GBuffer, Gfx } from 'engine';
import Pipeline from '../pipeline';
import shaderSource from './compose.wgsl';

/**
 * Composes a GBuffer into a single GPUTexture
 */
export default class ComposePipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private uniformBuffer: GPUBuffer;
	private sampler: GPUSampler;

	constructor(gfx: Gfx, format?: GPUTextureFormat) {
		super(gfx);

		const { device } = gfx;

		const shader = device.createShaderModule({ label: 'ComposePipeline Shader', code: shaderSource });

		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
					buffer: {}
				},
				{
					binding: 1,
					visibility: GPUShaderStage.FRAGMENT,
					sampler: {}
				},
				{
					binding: 2,
					visibility: GPUShaderStage.FRAGMENT,
					texture: {}
				}
			]
		});
		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [bindGroupLayout],
		});

		this.pipeline = device.createRenderPipeline({
			label: 'ComposePipeline',
			layout: pipelineLayout,
			vertex: { module: shader, entryPoint: 'vs_main' },
			fragment: { module: shader, entryPoint: 'fs_main', targets: [{ format: format || gfx.format }] },
			primitive: { topology: 'triangle-strip' },
		});

		this.uniformBuffer = device.createBuffer({
			size: 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

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
	}

	compose(encoder: GPUCommandEncoder, src: GBuffer, target: GPUTexture) {
		const { device } = this.gfx;

		const view = target.createView();
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
			label: 'ComposePipeline Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.uniformBuffer } },
				{ binding: 1, resource: this.sampler },
				{ binding: 2, resource: src.albedo.createView() },
			],
		});


		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.draw(4, 1, 0, 0);
		pass.end();
	}
}
