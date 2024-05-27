import { Gfx } from 'engine';
import { Pipeline } from 'engine/pipelines';
import shaderSource from './terrain_height_query.wgsl';
import { UniformBuffer } from 'engine/uniform_buffer';
import { Point2, Point3 } from 'engine/math';
import { identity, inverse, multiply } from 'engine/math/transform';
import { Camera } from 'engine/camera';

/**
 * Compute shader to get the terrain height at a given point
 */
export class TerrainHeightQueryPipeline extends Pipeline {
	private pipeline: GPUComputePipeline;
	private uniformBuffer: UniformBuffer;
	private resultBuffer: GPUBuffer;
	private readBuffer: GPUBuffer;
	private previousResult = 0;

	constructor(gfx: Gfx) {
		super(gfx);

		const { device } = gfx;

		// Query pipeline
		this.resultBuffer = device.createBuffer({ label: 'TerrainHeightQuery Result Buffer', size: 3 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
		this.readBuffer = device.createBuffer({  label: 'TerrainHeightQuery Read Buffer', size: 3 * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });

		this.uniformBuffer = new UniformBuffer(gfx, [
			['point', 'vec3f'],
			['seed', 'f32'],
		]);

		const shader = device.createShaderModule({ label: 'TerrainHeightQueryPipeline Query Shader', code: shaderSource });
		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.COMPUTE,
					buffer: {}
				},
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

		this.pipeline = gfx.device.createComputePipeline({
			label: 'TerrainHeightQueryPipeline Query Pipeline',
			layout: pipelineLayout,
			compute: { module: shader, entryPoint: 'main' },
		});

	}

	async queryWorldPoint(p: Point3, seed: number, relaxed: boolean = false): Promise<number> {
		// FIXME better handling of pending maps
		if (this.readBuffer.mapState !== 'unmapped') {
			return this.previousResult;
		}

		const { device } = this.gfx;

		this.uniformBuffer.set('seed', seed);
		this.uniformBuffer.set('point', p);

		const enc = device.createCommandEncoder({ label: 'TerrainHeightQueryPipeline Query Command Encoder' });
		const pass = enc.beginComputePass({ label: 'TerrainHeightQueryPipeline Query Compute Pass' });

		const bindGroup = device.createBindGroup({
			label: 'TerrainHeightQueryPipeline Query Bind Group',
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

		// Copy vec3f to the read buffer
		enc.copyBufferToBuffer(this.resultBuffer, 0, this.readBuffer, 0, 3 * 4);
		device.queue.submit([enc.finish()]);

		// Read back the result
		if (relaxed) {
			this.readBuffer.mapAsync(GPUMapMode.READ).then(() => {
				const result = new Float32Array(this.readBuffer.getMappedRange());
				this.previousResult = result[1];
				this.readBuffer.unmap();
			});
		} else {
			await this.readBuffer.mapAsync(GPUMapMode.READ);
			const result = new Float32Array(this.readBuffer.getMappedRange());
			this.previousResult = result[1];
			this.readBuffer.unmap();
		}

		return this.previousResult;
	}
}


