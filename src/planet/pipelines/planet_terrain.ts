import { Gfx } from 'engine';
import { Pipeline } from 'engine/pipelines';
import shaderSource from './planet_terrain.wgsl';
import { UniformBuffer } from 'engine/uniform_buffer';
import { SimpleMesh } from 'engine/mesh';

export interface TerrainOptions {
	seaLevel: number;
}

const DEFAULT_OPTIONS: TerrainOptions = {
	seaLevel: 0.5,
};

/**
 * Compute shader to extract a heightmap region
 */
export class PlanetTerrainPipeline extends Pipeline {
	private pipeline: GPUComputePipeline;
	private uniformBuffer: UniformBuffer;

	constructor(gfx: Gfx) {
		super(gfx);

		const { device } = gfx;

		this.uniformBuffer = new UniformBuffer(gfx, [
			['count', 'u32'],
			['seed', 'u32'],
			['seaLevel', 'f32'],
		]);

		const shader = device.createShaderModule({
			label: 'PlanetTerrainPipeline Query Shader',
			code: shaderSource,
		});
		const bindGroupLayout = device.createBindGroupLayout({
			label: 'PlanetTerrain BindGroup Layout',
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
			label: 'PlanetTerrainPipeline Query Pipeline',
			layout: pipelineLayout,
			compute: { 
				module: shader,
				entryPoint: 'main',
			},
		});

	}

	async compute(mesh: SimpleMesh, seed: number, options: Partial<TerrainOptions> = {}) {
		options = {...DEFAULT_OPTIONS, ...options };

		const { device } = this.gfx;
		const wgSize = 256;

		this.uniformBuffer.replace({
			count: mesh.vertexCount,
			seed,
			seaLevel: options.seaLevel || 0,
		});

		const enc = device.createCommandEncoder({ label: 'PlanetTerrainPipeline Command Encoder' });
		const pass = enc.beginComputePass({ label: 'PlanetTerrainPipeline Compute Pass' });

		const bindGroup = device.createBindGroup({
			label: 'PlanetTerrainPipeline Query Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: this.uniformBuffer.bindingResource() },
				{ binding: 1, resource: { buffer: mesh.vertexBuffer } },
			],
		});

		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(Math.ceil(mesh.vertexCount / wgSize));
		pass.end();
		device.queue.submit([enc.finish()]);
	}
}


