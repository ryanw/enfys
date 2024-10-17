import { Gfx } from 'engine';
import { Pipeline } from 'engine/pipelines';
import decorShaderSource from './decor.wgsl';
import { UniformBuffer } from 'engine/uniform_buffer';

const WorkgroupSize = [16, 16];
const WorkgroupCount = [64, 64];
const MaxInstances = WorkgroupSize[0] * WorkgroupSize[1] * WorkgroupCount[0] * WorkgroupCount[1];
const InstanceByteSize = (16 + 1 + 1 + 1) * 4;// FIXME mat4x4f + u32 + u32 + live:u32 derive from type? OffsetInstance
console.debug('Decor buffer size:', InstanceByteSize * MaxInstances);

export class DecorUniform extends UniformBuffer {
	constructor(gfx: Gfx) {
		super(gfx, [
			['position', 'vec2f'],
			['spacing', 'vec2f'],
			['density', 'f32'],
			['terrainSeed', 'f32'],
			['decorSeed', 'f32'],
			// FIXME improve nesting
			['clipping[0].origin', 'vec3f'],
			['clipping[0].normal', 'vec3f'],
			['clipping[1].origin', 'vec3f'],
			['clipping[1].normal', 'vec3f'],
			['clipping[2].origin', 'vec3f'],
			['clipping[2].normal', 'vec3f'],
			['clipping[3].origin', 'vec3f'],
			['clipping[3].normal', 'vec3f'],
			['clipping[4].origin', 'vec3f'],
			['clipping[4].normal', 'vec3f'],
			['clipping[5].origin', 'vec3f'],
			['clipping[5].normal', 'vec3f'],
		]);
	}
}

export class DecorPipeline extends Pipeline {
	protected pipeline: GPUComputePipeline;
	protected counter: GPUBuffer;
	protected counterRead: GPUBuffer;

	constructor(gfx: Gfx) {
		super(gfx);

		const { device } = gfx;

		this.counter = device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
		this.counterRead = device.createBuffer({ size: 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });

		const shader = device.createShaderModule({ label: 'DecorPipeline Shader', code: decorShaderSource });
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
			label: 'DecorPipeline',
			layout: pipelineLayout,
			compute: { module: shader, entryPoint: 'main' },
		});
	}

	createEmptyInstanceBuffer(): GPUBuffer {
		const { device } = this.gfx;


		const buffer = device.createBuffer({
			label: 'DecorMesh Instance Buffer',
			size: MaxInstances * InstanceByteSize,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
		});

		return buffer;
	}

	async createInstanceBuffer(uniform: DecorUniform, radius: number = 5): Promise<[GPUBuffer, number]> {
		const buffer = this.createEmptyInstanceBuffer();
		const count = await this.updateInstanceBuffer(buffer, uniform, radius);
		return [buffer, count];
	}

	async updateInstanceBuffer(buffer: GPUBuffer, uniform: DecorUniform, radius: number = 5): Promise<number> {
		const { device } = this.gfx;
		if (radius > WorkgroupCount[0]) {
			throw new Error(`Radius is too large, maximum is: ${WorkgroupCount[0]}`);
		}
		if (this.counterRead.mapState !== 'unmapped') {
			// FIXME
			return -1;
		}

		device.queue.writeBuffer(this.counter, 0, new Uint32Array([0]));


		const enc = device.createCommandEncoder({ label: 'DecorPipeline Command Encoder' });
		const pass = enc.beginComputePass({ label: 'DecorPipeline Compute Pass' });

		const bindGroup = device.createBindGroup({
			label: 'DecorPipeline Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				// Uniforms
				{ binding: 0, resource: uniform.bindingResource() },
				// Atomic counter
				{ binding: 1, resource: { buffer: this.counter } },
				// Mesh output buffer
				{ binding: 2, resource: { buffer: buffer } },
			],
		});

		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(radius, radius);
		pass.end();


		// Copy vec3f to the read buffer
		enc.copyBufferToBuffer(this.counter, 0, this.counterRead, 0, 4);
		device.queue.submit([enc.finish()]);

		// Read back the result
		await this.counterRead.mapAsync(GPUMapMode.READ);
		const result = new Uint32Array(this.counterRead.getMappedRange());
		const instanceCount = result[0];
		this.counterRead.unmap();


		return instanceCount;
	}
}
