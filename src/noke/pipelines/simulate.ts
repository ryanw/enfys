import { Gfx } from "engine";
import { Pipeline } from "engine/pipelines";
import simulateShaderCode from './simulate.wgsl';
import paintShaderCode from './paint.wgsl';
import { SandBuffer } from "../sand_buffer";
import { Point2 } from "engine/math";
import { UniformBuffer } from "engine/uniform_buffer";

export class SimulatePipeline extends Pipeline {
	private initPipeline: GPUComputePipeline;
	private tickPipeline: GPUComputePipeline;
	private paintPipeline: GPUComputePipeline;
	private clearPipeline: GPUComputePipeline;
	private brushUniform: UniformBuffer;
	private stepBuffers: Array<GPUBuffer>;
	constructor(gfx: Gfx) {
		super(gfx);
		const { device } = gfx;
		const simulateShader = device.createShaderModule({ label: 'SimulatePipeline Simulate Shader', code: simulateShaderCode });
		const paintShader = device.createShaderModule({ label: 'SimulatePipeline Paint Shader', code: paintShaderCode });
		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				// Front
				{
					binding: 0,
					visibility: GPUShaderStage.COMPUTE,
					buffer: { type: 'storage' }
				},
				// Back
				{
					binding: 1,
					visibility: GPUShaderStage.COMPUTE,
					buffer: { type: 'storage' }
				},
				// Dirty
				{
					binding: 2,
					visibility: GPUShaderStage.COMPUTE,
					buffer: { type: 'storage' }
				},
				// Arena
				{
					binding: 3,
					visibility: GPUShaderStage.COMPUTE,
					buffer: {}
				},
				// Frame
				{
					binding: 4,
					visibility: GPUShaderStage.COMPUTE,
					buffer: {}
				},
			]
		});

		const paintBindGroupLayout = device.createBindGroupLayout({
			entries: [
				// Front
				{
					binding: 0,
					visibility: GPUShaderStage.COMPUTE,
					buffer: { type: 'storage' }
				},
				// Arena
				{
					binding: 1,
					visibility: GPUShaderStage.COMPUTE,
					buffer: {}
				},
				// Brush
				{
					binding: 2,
					visibility: GPUShaderStage.COMPUTE,
					buffer: {}
				},
			]
		});


		const pipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [bindGroupLayout],
		});

		const paintPipelineLayout = device.createPipelineLayout({
			bindGroupLayouts: [paintBindGroupLayout],
		});

		this.initPipeline = gfx.device.createComputePipeline({
			label: 'SimulatePipeline Init',
			layout: pipelineLayout,
			compute: { module: simulateShader, entryPoint: 'init' },
		});

		this.tickPipeline = gfx.device.createComputePipeline({
			label: 'SimulatePipeline Tick',
			layout: pipelineLayout,
			compute: { module: simulateShader, entryPoint: 'tick' },
		});

		this.clearPipeline = gfx.device.createComputePipeline({
			label: 'SimulatePipeline Clear',
			layout: pipelineLayout,
			compute: { module: simulateShader, entryPoint: 'clear' },
		});

		this.paintPipeline = gfx.device.createComputePipeline({
			label: 'SimulatePipeline Paint',
			layout: paintPipelineLayout,
			compute: { module: paintShader, entryPoint: 'main' },
		});

		this.stepBuffers = [0,1,2,3].map(i => {
			const buffer = gfx.createBuffer(4, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
			device.queue.writeBuffer(buffer, 0, new Int32Array([i]));
			return buffer;
		});

		this.brushUniform = new UniformBuffer(gfx, [
			['position', 'vec2i'],
			['size', 'u32'],
			['material', 'u32'],
		]);
	}

	init(sand: SandBuffer) {
		const { ceil } = Math;
		const { device } = this.gfx;
		const enc = device.createCommandEncoder({ label: 'SimulatePipeline Init Command Encoder' });
		const pass = enc.beginComputePass({ label: 'SimulatePipeline Init Compute Pass' });
		const bindGroup = device.createBindGroup({
			label: 'SimulatePipeline Init Bind Group',
			layout: this.initPipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: sand.frontBuffer } },
				{ binding: 1, resource: { buffer: sand.backBuffer } },
				{ binding: 2, resource: { buffer: sand.dirtyBuffer } },
				{ binding: 3, resource: sand.arenaUniform.bindingResource() },
				{ binding: 4, resource: { buffer: this.stepBuffers[0] } },
			],
		});

		const [width, height] = sand.size;
		const workgroupSize = [16, 16];
		const workgroupCount = [ceil(width / workgroupSize[0]), ceil(height / workgroupSize[1])];

		pass.setPipeline(this.initPipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(workgroupCount[0], workgroupCount[1]);
		pass.end();
		device.queue.submit([enc.finish()]);
	}

	tick(sand: SandBuffer) {
		sand.arenaUniform.set('time', performance.now() / 1000.0);
		const { ceil } = Math;
		const { device } = this.gfx;
		const enc = device.createCommandEncoder({ label: 'SimulatePipeline Tick Command Encoder' });
		const pass = enc.beginComputePass({ label: 'SimulatePipeline Tick Compute Pass' });
		const bindGroups = [0, 1, 2, 3].map(i => device.createBindGroup({
			label: 'SimulatePipeline Tick Bind Group',
			layout: this.tickPipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: sand.frontBuffer } },
				{ binding: 1, resource: { buffer: sand.backBuffer } },
				{ binding: 2, resource: { buffer: sand.dirtyBuffer } },
				{ binding: 3, resource: sand.arenaUniform.bindingResource() },
				{ binding: 4, resource: { buffer: this.stepBuffers[i] } },
			],
		}));

		const sliceWidth = 4;
		const sliceHeight = 1080;
		const [width, height] = sand.size;
		const workgroupSize = [16, 16];
		const workgroupCount = [
			ceil(width / workgroupSize[0] / sliceWidth / 2),
			ceil(height / workgroupSize[1] / sliceHeight / 2),
		];

		const clearWorkgroupCount = [ceil(width / workgroupSize[0]), ceil(height / workgroupSize[1])];
		pass.setPipeline(this.clearPipeline);
		pass.setBindGroup(0, bindGroups[0]);
		pass.dispatchWorkgroups(clearWorkgroupCount[0], clearWorkgroupCount[1]);

		pass.setPipeline(this.tickPipeline);
		pass.setBindGroup(0, bindGroups[0]);
		pass.dispatchWorkgroups(workgroupCount[0], workgroupCount[1]);
		pass.setBindGroup(0, bindGroups[1]);
		pass.dispatchWorkgroups(workgroupCount[0], workgroupCount[1]);

		for (const bindGroup of bindGroups) {
			//pass.setBindGroup(0, bindGroup);
			//pass.dispatchWorkgroups(workgroupCount[0], workgroupCount[1]);
		}
		pass.end();
		device.queue.submit([enc.finish()]);
		//sand.swap();
	}

	paint(sand: SandBuffer, position: Point2, material: number, size: number = 16) {
		const { ceil } = Math;
		const { device } = this.gfx;
		const enc = device.createCommandEncoder({ label: 'SimulatePipeline Paint Command Encoder' });
		const pass = enc.beginComputePass({ label: 'SimulatePipeline Paint Compute Pass' });
		const bindGroup = device.createBindGroup({
			label: 'SimulatePipeline Paint Bind Group',
			layout: this.paintPipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: sand.frontBuffer } },
				{ binding: 1, resource: sand.arenaUniform.bindingResource() },
				{ binding: 2, resource: this.brushUniform.bindingResource() },
			],
		});
		this.brushUniform.replace({
			position,
			size,
			material,
		})

		const workgroupSize = [16, 16];
		const workgroupCount = [ceil(size / workgroupSize[0]), ceil(size / workgroupSize[1])];

		pass.setPipeline(this.paintPipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(workgroupCount[0], workgroupCount[1]);
		pass.end();
		device.queue.submit([enc.finish()]);
	}
}
