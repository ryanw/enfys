import { Gfx } from 'engine';
import { Pipeline } from 'engine/pipelines';
import shaderSource from './calculate_normals.wgsl';
import { UniformBuffer } from 'engine/uniform_buffer';
import { Point2 } from 'engine/math';
import { SimpleMesh } from 'engine/mesh';

export interface TerrainChunk {
	origin: Point2,
	size: [number, number],
	pixels: Float32Array,
}

/**
 * Compute shader to extract a heightmap region
 */
export class CalculateNormalsPipeline extends Pipeline {
	private pipeline: GPUComputePipeline;
	private uniformBuffer: UniformBuffer;

	constructor(gfx: Gfx) {
		super(gfx);

		const { device } = gfx;

		this.uniformBuffer = new UniformBuffer(gfx, [
			['count', 'u32'],
		]);

		const shader = device.createShaderModule({
			label: 'CalculateNormalsPipeline Query Shader',
			code: shaderSource,
		});
		const bindGroupLayout = device.createBindGroupLayout({
			label: 'CalculateNormals BindGroup Layout',
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
			label: 'CalculateNormalsPipeline Query Pipeline',
			layout: pipelineLayout,
			compute: {
				module: shader,
				entryPoint: 'main',
			},
		});

	}

	async compute(mesh: SimpleMesh) {
		const { device } = this.gfx;
		const wgSize = 256;
		const triangleCount = mesh.vertexCount / 3;

		this.uniformBuffer.replace({
			count: triangleCount,
		});

		const enc = device.createCommandEncoder({ label: 'CalculateNormalsPipeline Command Encoder' });
		const pass = enc.beginComputePass({ label: 'CalculateNormalsPipeline Compute Pass' });

		const bindGroup = device.createBindGroup({
			label: 'CalculateNormalsPipeline Query Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: this.uniformBuffer.bindingResource() },
				{ binding: 1, resource: { buffer: mesh.vertexBuffer } },
			],
		});


		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(Math.ceil(triangleCount / wgSize));
		pass.end();
		device.queue.submit([enc.finish()]);
	}
}



