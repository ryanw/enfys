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
	dither: boolean;
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
 * scene.addMesh({
 *   object: new Cube(gfx),
 *   transform: identity(),
 *   material: new Material([200, 80, 20, 255]),
 * });
 * const camera = new Camera();
 * await gfx.draw(scene, camera);
 */
export class Gfx {
	pixelRatio: number = 1/2;
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
		const w = this.canvas.clientWidth;
		const h = this.canvas.clientHeight;
		return [w, h];
	}

	configure(options: Partial<Config>) {
		const composeOpts = this.renderer.pipelines.compose.settings;
		if (options.dither != null) {
			composeOpts.dither = options.dither;
		}
		if (options.drawEdges != null) {
			composeOpts.drawEdges = options.drawEdges;
		}
		if (options.renderMode != null) {
			composeOpts.renderMode = options.renderMode;
		}
	}

	/**
	 * Updates the HTMLCanvasElement's width and height attributes to match its actual rendered pixel size
	 */
	updateSize() {
		const [w, h] = this.canvasSize;
		this.canvas.setAttribute('width', w.toString());
		this.canvas.setAttribute('height', h.toString());
	}

	async draw(scene: Scene, camera: Camera) {
		this.gbuffer.size = this.canvasSize.map(v => v * this.pixelRatio) as Vector2;
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

	/**
	 * Create a new GPUTexture
	 */
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
