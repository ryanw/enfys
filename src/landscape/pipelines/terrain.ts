import { Gfx, Size } from 'engine';
import { QuadMesh } from 'engine/mesh';
import { Pipeline } from 'engine/pipelines';
import shaderSource from './terrain.wgsl';
import { UniformBuffer } from 'engine/uniform_buffer';
import { Point2, Point3 } from 'engine/math';

/**
 * Compute Shader that takes a subdivided {@link QuadMesh}, updates the Y of every vertex, and recalculates every triangle's normal
 */
export class TerrainPipeline extends Pipeline {
	private pipeline: GPUComputePipeline;
	private uniformBuffer: UniformBuffer;

	constructor(gfx: Gfx) {
		super(gfx);

		const { device } = gfx;

		this.uniformBuffer = new UniformBuffer(gfx, [
			['size', 'vec2u'],
			['chunkId', 'vec3i'],
			['triangleCount', 'u32'],
			['seed', 'f32'],
		]);

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

		this.uniformBuffer.replace({ seed, size, chunkId, triangleCount });

		const vertexByteSize = (3 + 3 + 4) * 4;// FIXME derive from type? ColorVertex
		const buffer = device.createBuffer({
			label: 'TerrainMesh Attribute Buffer',
			size: vertexCount * vertexByteSize,
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
				{ binding: 0, resource: this.uniformBuffer.bindingResource() },
				// Mesh output buffer
				{ binding: 1, resource: { buffer: buffer } },
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

	async compute(terrain: QuadMesh, t: number = 0, encoder?: GPUCommandEncoder) {
		if (terrain.vertexCount === 0) {
			console.warn('Terrain has no vertices');
			return;
		}
		const { device } = this.gfx;
		const workgroupSize = 256;
		const triangleCount = terrain.vertexCount / 3;

		const enc = encoder || device.createCommandEncoder({ label: 'TerrainPipeline Command Encoder' });
		const pass = enc.beginComputePass({ label: 'TerrainPipeline Compute Pass' });
		this.uniformBuffer.set('t', t || performance.now() / 1000);

		const bindGroup = device.createBindGroup({
			label: 'TerrainPipeline Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.uniformBuffer.buffer } },
				{ binding: 1, resource: { buffer: terrain.vertexBuffer } },
			],
		});

		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(Math.ceil(triangleCount / workgroupSize));
		pass.end();
		if (!encoder) {
			device.queue.submit([enc.finish()]);
		}
	}
}
