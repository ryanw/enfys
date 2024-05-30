import { Gfx } from 'engine';
import { TerrainQueryPipeline } from '../landscape/pipelines/terrain_query';
import { Point2, Point3 } from 'engine/math';
import { Camera } from 'engine/camera';

export class PointerController {
	readonly gfx: Gfx;
	readonly mousePosition = { x: 0, y: 0, u: 0, v: 0 };
	private pipeline: TerrainQueryPipeline;
	private updating = false;
	private _worldPosition: Point3 = [0, 0, 0];

	get worldPosition(): Point3 {
		return [...this._worldPosition];
	}

	constructor(private el: HTMLElement, public camera: Camera, public seed: number) {
		this.gfx = camera.gfx;
		this.pipeline = new TerrainQueryPipeline(this.gfx);
		el.addEventListener('mousemove', this.onMouseMove);
	}

	async update() {
		if (this.updating) return;

		this.updating = true;
		const { u, v } = this.mousePosition;
		const uv: Point2 = [u, v];
		this._worldPosition = await this.pipeline.queryScreenPoint(
			uv,
			this.seed,
			this.camera,
			this.gfx.gbuffer.depth,
		);
		this.updating = false;
	}

	onMouseMove = async (e: MouseEvent) => {
		const { clientX: x, clientY: y } = e;
		const { clientWidth: width, clientHeight: height } = this.el;
		this.mousePosition.x = x;
		this.mousePosition.y = y;
		this.mousePosition.u = x / width;
		this.mousePosition.v = y / height;
		this.update();
	};

}
