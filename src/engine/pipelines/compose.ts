import { Color, Gfx } from 'engine';
import { Pipeline } from './';
import shaderSource from './compose.wgsl';
import { GBuffer } from 'engine/gbuffer';
import { UniformBuffer } from 'engine/uniform_buffer';

/**
 * Composes a {@link GBuffer} onto a single {@link GPUTexture}
 */
export class ComposePipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private uniformBuffer: UniformBuffer;
	private sampler: GPUSampler;

	constructor(gfx: Gfx, format?: GPUTextureFormat) {
		super(gfx);

		const { device } = gfx;

		const shader = device.createShaderModule({ label: 'ComposePipeline Shader', code: shaderSource });

		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: {}
				},
				{
					binding: 1,
					visibility: GPUShaderStage.FRAGMENT,
					sampler: {}
				},
				// Position
				{
					binding: 2,
					visibility: GPUShaderStage.FRAGMENT,
					texture: { sampleType: 'unfilterable-float' }
				},
				// Albedo
				{
					binding: 3,
					visibility: GPUShaderStage.FRAGMENT,
					texture: {}
				},
				// Normal
				{
					binding: 4,
					visibility: GPUShaderStage.FRAGMENT,
					texture: { sampleType: 'unfilterable-float' }
				},
				// Depth
				{
					binding: 5,
					visibility: GPUShaderStage.FRAGMENT,
					texture: { sampleType: 'unfilterable-float' }
				},
			]
		});
		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [bindGroupLayout],
		});

		const blendOver: GPUBlendComponent = {
			srcFactor: 'one',
			dstFactor: 'one-minus-src-alpha',
			operation: 'add',
		};
		this.pipeline = device.createRenderPipeline({
			label: 'ComposePipeline',
			layout: pipelineLayout,
			vertex: { module: shader, entryPoint: 'vs_main' },
			fragment: {
				module: shader,
				entryPoint: 'fs_main',
				targets: [{
					format: format || gfx.format,
					blend: {
						color: blendOver,
						alpha: blendOver,
					}
				}]
			},
			primitive: { topology: 'triangle-strip' },
		});

		this.uniformBuffer = new UniformBuffer(gfx, [
			['dither', 'i32'],
			['color', 'vec3f'],
			['t', 'f32'],
		]);
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

	compose(encoder: GPUCommandEncoder, src: GBuffer, target: GPUTexture, clear: Color = [0, 0, 0, 0]) {
		const { device } = this.gfx;

		const targetView = target.createView();

		this.uniformBuffer.set('dither', true);
		this.uniformBuffer.set('color', [0.6, 0.9, 0.0]);
		this.uniformBuffer.set('t', performance.now() / 1000.0);

		const clearValue = clear.map(v => v / 255);
		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{
					view: targetView,
					clearValue,
					loadOp: 'clear',
					storeOp: 'store',
				},
			],
		};

		const bindGroup = device.createBindGroup({
			label: 'ComposePipeline Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.uniformBuffer.buffer } },
				{ binding: 1, resource: this.sampler },
				{ binding: 2, resource: src.position.createView() },
				{ binding: 3, resource: src.albedo.createView() },
				{ binding: 4, resource: src.normal.createView() },
				{ binding: 5, resource: src.depth.createView() },
			],
		});


		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.draw(4, 1, 0, 0);
		pass.end();
	}
}
