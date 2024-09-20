import { Gfx } from "engine";
import { Pipeline } from "engine/pipelines";
import shaderSource from './conway.wgsl';

export class ConwayPipeline extends Pipeline {
	private initPipeline: GPUComputePipeline;
	private tickPipeline: GPUComputePipeline;
	constructor(gfx: Gfx) {
		super(gfx);
		const { device } = gfx;
		const shader = device.createShaderModule({ label: 'ConwayPipeline Shader', code: shaderSource });
		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.COMPUTE,
					texture: {}
				},
				{
					binding: 1,
					visibility: GPUShaderStage.COMPUTE,
					storageTexture: { access: "write-only", format: "rgba8unorm" }
				},
			]
		});

		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [bindGroupLayout],
		});

		this.initPipeline = gfx.device.createComputePipeline({
			label: 'ConwayPipeline',
			layout: pipelineLayout,
			compute: { module: shader, entryPoint: 'init' },
		});

		this.tickPipeline = gfx.device.createComputePipeline({
			label: 'ConwayPipeline',
			layout: pipelineLayout,
			compute: { module: shader, entryPoint: 'tick' },
		});
	}

	init(src: GPUTexture, dst: GPUTexture) {
		const { ceil } = Math;
		const { device } = this.gfx;
		const enc = device.createCommandEncoder({ label: 'ConwayPipeline Command Encoder' });
		const pass = enc.beginComputePass({ label: 'ConwayPipeline Compute Pass' });
		const bindGroup = device.createBindGroup({
			label: 'ConwayPipeline Bind Group',
			layout: this.initPipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: src.createView() },
				{ binding: 1, resource: dst.createView() },
			],
		});

		const { width, height } = dst;
		const workgroupSize = [16, 16];
		const workgroupCount = [ceil(width / workgroupSize[0]), ceil(height / workgroupSize[1])];

		pass.setPipeline(this.initPipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(workgroupCount[0], workgroupCount[1]);
		pass.end();
		device.queue.submit([enc.finish()]);
	}

	tick(src: GPUTexture, dst: GPUTexture) {
		const { ceil } = Math;
		const { device } = this.gfx;
		const enc = device.createCommandEncoder({ label: 'ConwayPipeline Command Encoder' });
		const pass = enc.beginComputePass({ label: 'ConwayPipeline Compute Pass' });
		const bindGroup = device.createBindGroup({
			label: 'ConwayPipeline Bind Group',
			layout: this.tickPipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: src.createView() },
				{ binding: 1, resource: dst.createView() },
			],
		});

		const { width, height } = dst;
		const workgroupSize = [16, 16];
		const workgroupCount = [ceil(width / workgroupSize[0]), ceil(height / workgroupSize[1])];

		pass.setPipeline(this.tickPipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(workgroupCount[0], workgroupCount[1]);
		pass.end();
		device.queue.submit([enc.finish()]);
	}
}
