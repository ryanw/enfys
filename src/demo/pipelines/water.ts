import { Gfx } from "engine";
import { QuadMesh } from "engine/mesh";
import { Pipeline } from "engine/pipelines";
import shaderSource from "./terrain.wgsl";
import { UniformBuffer } from "engine/uniform_buffer";

/**
 * Compute Shader that takes a subdivided {@link QuadMesh}, updates the Y of every vertex, and recalculates every triangle's normal
 */
export class WaterPipeline extends Pipeline {
	private pipeline: GPUComputePipeline
	private uniformBuffer: UniformBuffer;

	constructor(gfx: Gfx) {
		super(gfx);

		const { device } = gfx;

		this.uniformBuffer = new UniformBuffer(gfx, [
			['t', 'f32'],
		]);

		const shader = device.createShaderModule({ label: 'WaterPipeline Shader', code: shaderSource });
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
			label: 'WaterPipeline',
			layout: pipelineLayout,
			compute: { module: shader, entryPoint: "mainWater" },
		});
	}

	async compute(water: QuadMesh, t: number = 0, encoder?: GPUCommandEncoder) {
		const { device } = this.gfx;
		const workgroupSize = 256;
		const triangleCount = water.vertexCount / 3;

		const enc = encoder || device.createCommandEncoder({ label: "WaterPipeline Command Encoder" });
		const pass = enc.beginComputePass({ label: "WaterPipeline Compute Pass" });
		this.uniformBuffer.set('t', t || performance.now() / 1000);

		const bindGroup = device.createBindGroup({
			label: 'WaterPipeline Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.uniformBuffer.buffer } },
				{ binding: 1, resource: { buffer: water.buffer } },
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
