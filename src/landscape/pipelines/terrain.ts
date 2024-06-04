import { Gfx, Size } from 'engine';
import { QuadMesh } from 'engine/mesh';
import { Pipeline } from 'engine/pipelines';
import shaderSource from './terrain.wgsl';
import { UniformBuffer } from 'engine/uniform_buffer';
import { Point3 } from 'engine/math';
import { Color } from 'engine/color';
import { RingBuffer } from 'engine/ring_buffer';

/**
 * Compute Shader that takes a subdivided {@link QuadMesh}, updates the Y of every vertex, and recalculates every triangle's normal
 */
export class TerrainPipeline extends Pipeline {
	private pipeline: GPUComputePipeline;
	private chunkUniformBuffer: RingBuffer;
	private terrainColors: GPUTexture;

	constructor(gfx: Gfx, colors: Array<Color>) {
		super(gfx);

		const { device } = gfx;

		this.chunkUniformBuffer = new RingBuffer(gfx, 1024, [
			['size', 'vec2u'],
			['chunkId', 'vec3i'],
			['triangleCount', 'u32'],
			['seed', 'f32'],
		]);

		this.terrainColors = device.createTexture({
			label: 'Terrain Colours Texture',
			dimension: '1d',
			format: 'rgba8unorm',
			size: { width: colors.length },
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
		});
		device.queue.writeTexture(
			{ texture: this.terrainColors },
			new Uint8Array(colors.flat()),
			{},
			{ width: colors.length, height: 1 },
		);


		const shader = device.createShaderModule({ label: 'TerrainPipeline Shader', code: shaderSource });
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
				// Terrain colour palette
				{
					binding: 2,
					visibility: GPUShaderStage.COMPUTE,
					texture: {
						viewDimension: '1d',
					}
				},
			]
		});

		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [bindGroupLayout],
		});

		this.pipeline = gfx.device.createComputePipeline({
			label: 'TerrainPipeline',
			layout: pipelineLayout,
			compute: { module: shader, entryPoint: 'main' },
		});
	}

	async createVertexBuffer(size: Size, chunkId: Point3, seed: number, encoder?: GPUCommandEncoder): Promise<GPUBuffer> {
		const { device } = this.gfx;
		const quadCount = size[0] * size[1];
		const triangleCount = quadCount * 2;
		const vertexCount = quadCount * 6;

		const uniformId = this.chunkUniformBuffer.push({ seed, size, chunkId, triangleCount });

		const vertexByteSize = (3 + 3 + 1) * 4;// FIXME derive from type? ColorVertex
		const bufferSize = vertexCount * vertexByteSize;
		console.log("Creating terrain vertex buffer", bufferSize);
		const buffer = device.createBuffer({
			label: 'TerrainMesh Attribute Buffer Create',
			size: bufferSize,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
		});

		const workgroupSize = 256;
		const workgroupCount = Math.ceil(triangleCount / workgroupSize);

		const enc = encoder || device.createCommandEncoder({ label: 'TerrainPipeline Command Encoder' });
		const pass = enc.beginComputePass({ label: 'TerrainPipeline Compute Pass' });

		const bindGroup = device.createBindGroup({
			label: 'TerrainPipeline Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				// Uniforms
				{ binding: 0, resource: this.chunkUniformBuffer.itemBindingResource(uniformId) },
				// Mesh output buffer
				{ binding: 1, resource: { buffer: buffer } },
				// Terrain colour
				{ binding: 2, resource: this.terrainColors.createView() },
			],
		});

		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(workgroupCount);
		pass.end();
		if (!encoder) {
			device.queue.submit([enc.finish()]);
		}
		return buffer;
	}
}
