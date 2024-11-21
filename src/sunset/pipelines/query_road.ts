import { Gfx } from 'engine';
import queryRoadSource from './query_road.wgsl';
import { Pipeline } from 'engine/pipelines';
import { Vector2, Vector3 } from 'engine/math';
import { UniformBuffer } from 'engine/uniform_buffer';

export type QueryRoadResult = {
	tangent: Vector3,
	offset: Vector2,
};

const RESULT_SIZE = 32; // bytes - aligned size_of<QueryRoadResult>

export class QueryRoadPipeline extends Pipeline {
	protected pipeline: GPUComputePipeline;
	private uniformBuffer: UniformBuffer;
	private resultBuffer: GPUBuffer;
	private readBuffer: GPUBuffer;
	private previousResult: Readonly<QueryRoadResult> = { tangent: [0, 0, 0], offset: [0, 0] }

	constructor(gfx: Gfx) {
		super(gfx);
		const { device } = gfx;

		this.resultBuffer = device.createBuffer({ size: RESULT_SIZE, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
		this.readBuffer = device.createBuffer({ size: RESULT_SIZE, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
		this.uniformBuffer = new UniformBuffer(gfx, [
			['z', 'f32'],
		]);

		const shader = device.createShaderModule({
			label: `Query Road Shader`,
			code: queryRoadSource
		});

		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				// Uniform
				{
					binding: 0,
					visibility: GPUShaderStage.COMPUTE,
					buffer: {}
				},
				// Result
				{
					binding: 1,
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

		const pipelineDescriptor: GPUComputePipelineDescriptor = {
			label: `Query Road Pipeline`,
			layout: pipelineLayout,
			compute: {
				module: shader,
				entryPoint: 'main',
			},
		};

		this.pipeline = device.createComputePipeline(pipelineDescriptor);
	}

	async query(z: number): Promise<QueryRoadResult> {
		if (this.readBuffer.mapState === 'pending') {
			return this.previousResult;
		}

		const { device } = this.gfx;

		this.uniformBuffer.replace({ z });

		const enc = device.createCommandEncoder({ label: 'TerrainQueryPipeline Query Command Encoder' });
		const pass = enc.beginComputePass({ label: 'TerrainQueryPipeline Query Compute Pass' });

		const bindGroup = device.createBindGroup({
			label: 'TerrainQueryPipeline Query Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				// Uniforms
				{ binding: 0, resource: this.uniformBuffer.bindingResource() },
				// Query output buffer
				{ binding: 1, resource: { buffer: this.resultBuffer } },
			],
		});

		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(1);
		pass.end();

		// Copy vec4f to the read buffer
		enc.copyBufferToBuffer(this.resultBuffer, 0, this.readBuffer, 0, RESULT_SIZE);
		device.queue.submit([enc.finish()]);

		// Read back the result
		await this.readBuffer.mapAsync(GPUMapMode.READ);
		const result = new Float32Array(this.readBuffer.getMappedRange());
		this.previousResult = Object.freeze({
			tangent: Array.from(result.slice(0, 3)),
			offset: Array.from(result.slice(4, 7)),
		} as QueryRoadResult);
		this.readBuffer.unmap();

		return this.previousResult;
	}
}
