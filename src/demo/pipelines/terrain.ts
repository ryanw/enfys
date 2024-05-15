import { Gfx } from "engine";
import { QuadMesh } from "engine/mesh";
import { Pipeline } from "engine/pipelines";
import shaderSource from "./terrain.wgsl";
import { UniformBuffer } from "engine/uniform_buffer";

/**
 * Updates a subdivided {@link QuadMesh} using a computed heightmap
 */
export class TerrainPipeline extends Pipeline {
	private pipeline: GPUComputePipeline
	private uniformBuffer: UniformBuffer;

	constructor(gfx: Gfx) {
		super(gfx);

		const { device } = gfx;

		this.uniformBuffer = new UniformBuffer(gfx, [
			['t', 'f32'],
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
			compute: { module: shader, entryPoint: "main" },
		});
	}

	async compute(terrain: QuadMesh, t: number, encoder?: GPUCommandEncoder) {
		const { device } = this.gfx;
		const workgroupSize = 256;
		const triangleCount = terrain.vertexCount / 3;

		const enc = encoder || device.createCommandEncoder({ label: "TerrainPipeline Command Encoder" });
		const pass = enc.beginComputePass({ label: "TerrainPipeline Compute Pass" });
		this.uniformBuffer.set('t', performance.now() / 1000);

		const bindGroup = device.createBindGroup({
			label: 'TerrainPipeline Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.uniformBuffer.buffer } },
				{ binding: 1, resource: { buffer: terrain.buffer } },
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
