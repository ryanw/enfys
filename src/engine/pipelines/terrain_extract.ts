import { Gfx } from 'engine';
import { Pipeline } from 'engine/pipelines';
import shaderSource from './terrain_extract.wgsl';
import { UniformBuffer } from 'engine/uniform_buffer';
import { Point2, Vector2 } from 'engine/math';

export interface TerrainChunk {
	origin: Point2,
	size: [number, number],
	pixels: Float32Array,
}

/**
 * Compute shader to extract a heightmap region
 */
export class TerrainExtractPipeline extends Pipeline {
	private pipeline: GPUComputePipeline;
	private uniformBuffer: UniformBuffer;
	private resultBuffer: GPUBuffer;
	private readBuffer: GPUBuffer;

	constructor(gfx: Gfx, private size: Vector2 = [1024, 1024]) {
		super(gfx);

		const { device } = gfx;

		this.resultBuffer = device.createBuffer({
			label: 'TerrainExtract Result Buffer',
			size: this.bufferSize,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
		});
		this.readBuffer = device.createBuffer({
			label: 'TerrainExtract Read Buffer',
			size: this.bufferSize,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
		});

		this.uniformBuffer = new UniformBuffer(gfx, [
			['origin', 'vec2f'],
			['size', 'vec2f'],
			['seed', 'f32'],
		]);

		const shader = device.createShaderModule({ label: 'TerrainExtractPipeline Query Shader', code: shaderSource });
		const bindGroupLayout = device.createBindGroupLayout({
			label: 'TerrainExtract BindGroup Layout',
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
			label: 'TerrainExtractPipeline Query Pipeline',
			layout: pipelineLayout,
			compute: { module: shader, entryPoint: 'main' },
		});

	}

	get bufferSize(): number {
		const pixelSize = 4; // size_of::<f32>
		const pixelCount = this.size[0] * this.size[1];
		return pixelCount * pixelSize;
	}

	async extractChunk(origin: Point2, size: Vector2, seed: number): Promise<TerrainChunk> {
		if (this.readBuffer.mapState !== 'unmapped') {
			return new Promise((resolve, reject) => {
				const t = setInterval(() => {
					if (this.readBuffer.mapState === 'unmapped') {
						clearInterval(t);
						resolve(this.computeChunk(origin, size, seed));
					}
				}, 1);
			});
		}
		return await this.computeChunk(origin, size, seed);
	}

	async computeChunk(origin: Point2, size: Vector2, seed: number): Promise<TerrainChunk> {
		// FIXME better handling of pending maps
		if (this.readBuffer.mapState !== 'unmapped') {
			throw new Error('Attempted to extract chunk while extracting');
		}

		// Must match the shader
		const wg_size = [16, 16];
		const { device } = this.gfx;

		this.uniformBuffer.set('seed', seed);
		this.uniformBuffer.set('origin', origin);
		this.uniformBuffer.set('size', size);

		const enc = device.createCommandEncoder({ label: 'TerrainExtractPipeline Query Command Encoder' });
		const pass = enc.beginComputePass({ label: 'TerrainExtractPipeline Query Compute Pass' });

		const bindGroup = device.createBindGroup({
			label: 'TerrainExtractPipeline Query Bind Group',
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
		pass.dispatchWorkgroups(
			Math.ceil(size[0] / wg_size[0]),
			Math.ceil(size[1] / wg_size[1]),
		);
		pass.end();

		// Copy vec3f to the read buffer
		enc.copyBufferToBuffer(this.resultBuffer, 0, this.readBuffer, 0, this.bufferSize);
		device.queue.submit([enc.finish()]);

		await this.readBuffer.mapAsync(GPUMapMode.READ);
		const pixels = new Float32Array(this.readBuffer.getMappedRange()).slice(0);
		this.readBuffer.unmap();

		return {
			origin,
			size: [...size],
			pixels,
		};
	}
}


