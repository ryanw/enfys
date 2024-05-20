import { Gfx } from 'engine';
import { Pipeline } from 'engine/pipelines';
import shaderSource from './terrain_query.wgsl';
import { UniformBuffer } from 'engine/uniform_buffer';
import { Point2, Point3 } from 'engine/math';
import { identity, inverse, multiply } from 'engine/math/transform';
import { Camera } from 'engine/camera';

/**
 * Compute shader to get the terrain height at a given point
 */
export class TerrainQueryPipeline extends Pipeline {
	private pipeline: GPUComputePipeline;
	private uniformBuffer: UniformBuffer;
	private resultBuffer: GPUBuffer;
	private readBuffer: GPUBuffer;
	private previousResult: Point3 = [0, 0, 0];

	constructor(gfx: Gfx) {
		super(gfx);

		const { device } = gfx;

		// Query pipeline
		this.resultBuffer = device.createBuffer({ size: 3 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
		this.readBuffer = device.createBuffer({ size: 3 * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });

		this.uniformBuffer = new UniformBuffer(gfx, [
			['invMvp', 'mat4x4f'],
			['uv', 'vec2f'],
			['seed', 'f32'],
		]);

		const shader = device.createShaderModule({ label: 'TerrainQueryPipeline Query Shader', code: shaderSource });
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
					texture: { sampleType: 'unfilterable-float' }
				},
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
			label: 'TerrainQueryPipeline Query Pipeline',
			layout: pipelineLayout,
			compute: { module: shader, entryPoint: 'main' },
		});

	}

	async queryPoint(uv: Point2, seed: number, camera: Camera, depth: GPUTexture): Promise<Point3> {
		// FIXME better handling of pending maps
		if (this.readBuffer.mapState === 'pending') {
			return this.previousResult;
		}

		const { device } = this.gfx;

		const cameraInvMvp = inverse(multiply(camera.projection, camera.view));
		const invMvp = cameraInvMvp || identity();
		this.uniformBuffer.replace({ invMvp, uv, seed });

		const enc = device.createCommandEncoder({ label: 'TerrainQueryPipeline Query Command Encoder' });
		const pass = enc.beginComputePass({ label: 'TerrainQueryPipeline Query Compute Pass' });

		const bindGroup = device.createBindGroup({
			label: 'TerrainQueryPipeline Query Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				// Uniforms
				{ binding: 0, resource: this.uniformBuffer.bindingResource() },
				// Depth texture for mouse test
				{ binding: 1, resource: depth.createView() },
				// Query output buffer
				{ binding: 2, resource: { buffer: this.resultBuffer } },
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
		await this.readBuffer.mapAsync(GPUMapMode.READ);
		const result = new Float32Array(this.readBuffer.getMappedRange());
		this.previousResult = [result[0], result[1], result[2]];
		this.readBuffer.unmap();

		return this.previousResult;
	}
}


