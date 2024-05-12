import { Camera } from './camera';
import { GBuffer } from './gbuffer';
import { Vector2, Vector4 } from './math';
import ComposePipeline from './pipelines/compose';
import Renderer from './renderer';
import Scene from './scene';

export { GBuffer, Scene, Renderer };
export * as math from './math';

export type Color = Vector4;
export type Size = Vector2;

export class Gfx {
	pixelRatio: number = 1/4;
	readonly context: GPUCanvasContext;
	readonly format: GPUTextureFormat;
	readonly gbuffer: GBuffer;
	private renderer: Renderer;

	/**
	 * Initialise the WebGPU Context and return a new Gfx instance
	 */
	static async attach(canvas: HTMLCanvasElement): Promise<Gfx> {
		if (!navigator?.gpu) throw new UnsupportedError();
		const adapter = await navigator.gpu.requestAdapter();
		if (!adapter) throw new UnsupportedError();
		const device = await adapter.requestDevice();
		if (!device) throw new UnsupportedError();
		return new Gfx(canvas, adapter, device);
	}

	constructor(
		readonly canvas: HTMLCanvasElement,
		readonly adapter: GPUAdapter,
		readonly device: GPUDevice,
	) {
		this.format = navigator.gpu.getPreferredCanvasFormat();
		this.context = canvas.getContext('webgpu') as GPUCanvasContext;
		this.context.configure({
			device: this.device,
			format: this.format,
			alphaMode: 'premultiplied',
		});

		this.gbuffer = new GBuffer(this);
		this.updateSize();

		this.renderer = new Renderer(this);

		const resizeObserver = new ResizeObserver(() => this.updateSize());
		resizeObserver.observe(this.canvas);

	}

	get currentTexture(): GPUTexture {
		return this.context.getCurrentTexture();
	}

	get size(): Size {
		const w = this.canvas.clientWidth;
		const h = this.canvas.clientHeight;
		return [w, h];
	}

	/**
	 * Updates the HTMLCanvasElement's width and height attributes to match its actual rendered pixel size
	 */
	updateSize() {
		const [w, h] = this.size;
		this.canvas.setAttribute('width', w.toString());
		this.canvas.setAttribute('height', h.toString());
	}

	async draw(scene: Scene, camera: Camera) {
		this.gbuffer.size = this.size.map(v => v * this.pixelRatio) as Vector2;
		await this.encode(async (encoder) => {
			this.renderer.drawScene(encoder, scene, camera, this.gbuffer);
			this.renderer.compose(encoder, this.gbuffer, this.currentTexture, scene.clearColor);
		});
	}

	/**
	 * Create and submit a GPUCommandEncoder filled using an async callback
	 */
	async encode(callback: (encoder: GPUCommandEncoder) => Promise<void>) {
		const { device } = this;
		const encoder = device.createCommandEncoder();
		await callback(encoder);
		device.queue.submit([encoder.finish()]);
	}

	createTexture(format: GPUTextureFormat, size: GPUExtent3DStrict = [1, 1], label?: string): GPUTexture {
		const device = this.device;
		let usage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST;

		if (['rgba8unorm', 'rgba8uint', 'r32float'].includes(format)) {
			usage |= GPUTextureUsage.STORAGE_BINDING;
		}
		if (['rgba8unorm', 'rgba8snorm', 'rgba16float', 'rgba32float', 'depth32float', 'depth24plus'].includes(format)) {
			usage |= GPUTextureUsage.RENDER_ATTACHMENT;
		}

		return device.createTexture({
			label,
			format,
			size,
			usage
		});
	}

	createBuffer(size: number, usage: GPUBufferUsageFlags): GPUBuffer {
		return this.device.createBuffer({ size, usage });
	}
}

export class UnsupportedError extends Error {
	constructor() {
		super("Your browser doesn't support WebGPU");
	}
}
