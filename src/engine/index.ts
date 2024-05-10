import { GBuffer } from "./gbuffer";
import { Vector2, Vector4 } from "./math";

export type Color = Vector4;
export type Size = Vector2;

export class Gfx {
	readonly context: GPUCanvasContext;
	readonly format: GPUTextureFormat;
	readonly gbuffer: GBuffer;
	private _clearColor: Color = [0, 0, 0, 0];

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

		const resizeObserver = new ResizeObserver(() => this.updateSize());
		resizeObserver.observe(this.canvas);

	}

	get clearColor(): Color {
		return [...this._clearColor];
	}

	set clearColor(color: Color) {
		this._clearColor = color;
	}

	get currentTexture(): GPUTexture {
		return this.context.getCurrentTexture();
	}

	get size(): Size {
		const w = this.canvas.clientWidth;
		const h = this.canvas.clientHeight;
		return [w, h];
	}

	createTexture(format: GPUTextureFormat, size: GPUExtent3DStrict = [1, 1], label?: string): GPUTexture {
		const device = this.device;
		let usage =
			GPUTextureUsage.TEXTURE_BINDING |
			GPUTextureUsage.COPY_DST;

		switch (format) {
			case 'rgba8unorm':
			case 'rgba8uint':
			case 'r32float': {
				usage |= GPUTextureUsage.STORAGE_BINDING;
				break;
			}

			case 'rgba8unorm':
			case 'rgba8snorm':
			case 'rgba16float':
			case 'rgba32float':
			case 'depth32float':
				usage |= GPUTextureUsage.RENDER_ATTACHMENT;
				break;
		}

		return device.createTexture({
			label,
			format,
			size,
			usage
		});
	}

	/**
	 * Updates the HTMLCanvasElement's width and height attributes to match its actual rendered pixel size
	 */
	updateSize() {
		const [w, h] = this.size;
		this.canvas.setAttribute('width', w.toString());
		this.canvas.setAttribute('height', h.toString());
	}

	async draw() {
		//this.gbuffer.size = this.size;
		// FIXME temp hack
		this.gbuffer.size = [this.currentTexture.width, this.currentTexture.height];
		this.gbuffer.albedo = this.currentTexture;
		await this.encode(async (enc) => this.clear(enc));
	}

	clear(encoder: GPUCommandEncoder) {
		const clearValue = { r: 0.4, g: 0.1, b: 0.5, a: 1.0 };
		const albedoView = this.gbuffer.albedo.createView();
		const depthView = this.gbuffer.depth.createView();

		encoder.beginRenderPass({
			colorAttachments: [{
				view: albedoView,
				clearValue,
				loadOp: 'clear',
				storeOp: 'store',
			}],
			depthStencilAttachment: {
				view: depthView,
				depthClearValue: 1.0,
				depthLoadOp: 'clear',
				depthStoreOp: 'store',
			}
		}).end();
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
}

export class UnsupportedError extends Error {
	constructor() {
		super("Your browser doesn't support WebGPU");
	}
}
