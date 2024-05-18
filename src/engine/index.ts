import { Camera } from './camera';
import { GBuffer } from './gbuffer';
import { Point3, Vector2, Vector3, Vector4 } from './math';
import { cross, normalize, subtract } from './math/vectors';
import { NormalVertex } from './mesh';
import { Renderer } from './renderer';
import { Scene } from './scene';

export { Color } from './color';
export type Size = Vector2;

export interface Config {
	ditherSize: number;
	ditherDepth: number;
	drawEdges: boolean;
	renderMode: number;
}

/**
 * Main rendering context, all access to the GPU goes through this.
 *
 * @example
 * const canvas = document.querySelector('canvas');
 * const gfx = await Gfx.attach(canvas);
 * const scene = new Scene();
 * scene.add(new Entity(
 *   gfx,
 *   new Cube(gfx),
 *   new Material([200, 80, 20, 255]),
 * ));
 * const camera = new Camera();
 * await gfx.draw(scene, camera);
 */
export class Gfx {
	pixelRatio: number = 1;
	canvasPixelRatio: number = window.devicePixelRatio || 1;
	readonly context: GPUCanvasContext;
	readonly format: GPUTextureFormat;
	readonly gbuffer: GBuffer;
	private renderer: Renderer;
	private frameSample: number = 128;
	private frameTimes: Array<number> = [];

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

	/**
	 * Construct a new {@link Gfx} from a WebGPU Adapter and Device.
	 * What you instead probably want to use is {@link Gfx.attach}
	 */
	constructor(
		/**
		 * Canvas element to attach to. It must not have had a graphics context already created.
		 */
		readonly canvas: HTMLCanvasElement,
		/**
		 * WebGPU adapter interface
		 */
		readonly adapter: GPUAdapter,
		/**
		 * WebGPU logical device
		 */
		readonly device: GPUDevice,
	) {
		canvas.setAttribute('tabIndex', '0');
		canvas.focus();
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
		resizeObserver.observe(this.canvas.parentElement!);

	}

	/**
	 * GPUTexture that will be drawn to the screen
	 */
	get currentTexture(): GPUTexture {
		return this.context.getCurrentTexture();
	}

	/**
	 * Size of the GBuffer
	 */
	get canvasSize(): Size {
		const w = this.canvas.clientWidth * this.canvasPixelRatio | 0
		const h = this.canvas.clientHeight * this.canvasPixelRatio | 0;
		return [w, h];
	}

	get fps(): number {
		if (this.frameTimes.length < this.frameSample) {
			return 0;
		}
		const total = this.frameTimes.reduce((a, dt) => a + 1 / dt, 0);
		return total / this.frameTimes.length;
	}

	configure(config: Partial<Config & { canvasPixelRatio: number }>) {
		if (config.canvasPixelRatio) {
			this.canvasPixelRatio = config.canvasPixelRatio;
		}
		Object.assign(
			this.renderer.pipelines.compose.config,
			config,
		);
	}

	/**
	 * Updates the HTMLCanvasElement's width and height attributes to match its actual rendered pixel size
	 */
	updateSize() {
		const w = Math.floor(this.canvas.parentElement!.clientWidth * this.canvasPixelRatio);
		const h = Math.floor(this.canvas.parentElement!.clientHeight * this.canvasPixelRatio);
		this.canvas.setAttribute('width', w.toFixed(0));
		this.canvas.setAttribute('height', h.toFixed(0));
		// Hack for odd numbers causing weird scaling
		this.canvas.style.width = (w / this.canvasPixelRatio) + 'px';
		this.canvas.style.height = (h / this.canvasPixelRatio) + 'px';
	}

	async draw(scene: Scene, camera: Camera) {
		this.gbuffer.size = this.canvasSize.map(v => v * this.pixelRatio) as Vector2;
		await this.encode(async (encoder) => {
			this.renderer.drawScene(encoder, scene, camera, this.gbuffer);
			this.renderer.compose(encoder, this.gbuffer, camera, this.currentTexture, scene.clearColor);
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

	/**
	 * Start an infinite draw loop, running the callback before drawing each frame
	 */
	run(callback: (dt: number, gfx: Gfx) => Promise<void>) {
		let now = performance.now();
		let dt = 0;
		const draw = async () => {
			dt = (performance.now() - now) / 1000;
			now = performance.now();
			this.sampleFrame(dt);
			await callback(dt, this);
			requestAnimationFrame(draw);
		}
		draw();
	}

	private sampleFrame(dt: number) {
		if (dt <= 0) return;
		this.frameTimes.push(dt);
		while (this.frameTimes.length > this.frameSample) {
			this.frameTimes.shift();
		}
	}

	/**
	 * Create a new GPUTexture
	 */
	createTexture(format: GPUTextureFormat, size: GPUExtent3DStrict = [1, 1], label?: string): GPUTexture {
		const device = this.device;
		let usage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST;

		if (['r32uint', 'rgba8unorm', 'rgba8uint', 'r32float'].includes(format)) {
			usage |= GPUTextureUsage.STORAGE_BINDING;
		}
		if (['r32uint', 'r8uint', 'rgba8unorm', 'rgba8snorm', 'rgba16float', 'rgba32float', 'depth32float', 'depth24plus'].includes(format)) {
			usage |= GPUTextureUsage.RENDER_ATTACHMENT;
		}

		return device.createTexture({
			label,
			format,
			size,
			usage
		});
	}

	/**
	 * Create a new GPUBuffer
	 */
	createBuffer(size: number, usage: GPUBufferUsageFlags): GPUBuffer {
		return this.device.createBuffer({ size, usage });
	}
}

/**
 * Exception when the platform does not support WebGPU
 */
export class UnsupportedError extends Error {
	constructor() {
		super("Your browser doesn't support WebGPU");
	}
}

/**
 * Update the normals in a collection of {@link NormalVertex} so they're perpendicular to the triangle's surface
 */
export function calculateNormals(vertices: Array<NormalVertex>) {
	for (let i = 0; i < vertices.length; i += 3) {
		const p0 = vertices[i + 0].position;
		const p1 = vertices[i + 1].position;
		const p2 = vertices[i + 2].position;

		const v0 = subtract(p1, p0);
		const v1 = subtract(p2, p0);
		const normal = normalize(cross(v0, v1));
		vertices[i + 0].normal = normal;
		vertices[i + 1].normal = normal;
		vertices[i + 2].normal = normal;
	}
}
