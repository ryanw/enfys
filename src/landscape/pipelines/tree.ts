import { Gfx } from 'engine';
import { Pipeline } from 'engine/pipelines';
import shaderSource from './tree.wgsl';
import { UniformBuffer } from 'engine/uniform_buffer';
import { Point3 } from 'engine/math';

export class TreePipeline extends Pipeline {
	private pipeline: GPUComputePipeline;
	private uniformBuffer: UniformBuffer;
	private counter: GPUBuffer;
	private counterRead: GPUBuffer;

	constructor(gfx: Gfx) {
		super(gfx);

		const { device } = gfx;

		this.uniformBuffer = new UniformBuffer(gfx, [
			['position', 'vec3f'],
			['radius', 'f32'],
			['density', 'f32'],
			['seed', 'f32'],
		]);

		this.counter = device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
		this.counterRead = device.createBuffer({ size: 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });

		const shader = device.createShaderModule({ label: 'TreePipeline Shader', code: shaderSource });
		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.COMPUTE,
					buffer: {}
				},
				// Atomic counter
				{
					binding: 1,
					visibility: GPUShaderStage.COMPUTE,
					buffer: {
						type: 'storage',
					}
				},
				// Output
				{
					binding: 2,
					visibility: GPUShaderStage.COMPUTE,
					buffer: {
						type: 'storage',
					}
				},
			]
		});

		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [bindGroupLayout],
		});

		this.pipeline = gfx.device.createComputePipeline({
			label: 'TreePipeline',
			layout: pipelineLayout,
			compute: { module: shader, entryPoint: 'main' },
		});
	}

	async createInstanceBuffer(position: Point3, radius: number, density: number, seed: number): Promise<[GPUBuffer, number]> {
		const { device } = this.gfx;

		const maxInstances = 512000;
		this.uniformBuffer.replace({ seed, position, radius, density });
		device.queue.writeBuffer(this.counter, 0, new Uint32Array([0]));

		const instanceByteSize = 3 * 4;// FIXME vec3f derive from type? OffsetInstance
		const buffer = device.createBuffer({
			label: 'TreeMesh Attribute Buffer',
			size: maxInstances * instanceByteSize,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
		});


		const enc = device.createCommandEncoder({ label: 'TreePipeline Command Encoder' });
		const pass = enc.beginComputePass({ label: 'TreePipeline Compute Pass' });

		const bindGroup = device.createBindGroup({
			label: 'TreePipeline Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				// Uniforms
				{ binding: 0, resource: this.uniformBuffer.bindingResource() },
				// Atomic counter
				{ binding: 1, resource: { buffer: this.counter } },
				// Mesh output buffer
				{ binding: 2, resource: { buffer: buffer } },
			],
		});

		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(16, 16);
		pass.end();


		// Copy vec3f to the read buffer
		enc.copyBufferToBuffer(this.counter, 0, this.counterRead, 0, 4);
		device.queue.submit([enc.finish()]);

		// Read back the result
		await this.counterRead.mapAsync(GPUMapMode.READ);
		const result = new Uint32Array(this.counterRead.getMappedRange());
		const instanceCount = result[0];
		this.counterRead.unmap();


		return [buffer, instanceCount];
	}
}
