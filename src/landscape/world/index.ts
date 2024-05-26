import { Gfx } from "engine";
import { Camera } from "engine/camera";
import { Point3 } from "engine/math";
import { TerrainHeightQueryPipeline } from "../pipelines/terrain_height_query";
import { CameraController, FreeCameraController, OrbitCameraController } from "engine/input";



export class World {
	player = new Player();
	spawnPosition: Point3 = [0, 0, 0];
	cameras: Array<CameraController> = [];
	queryTerrain: TerrainHeightQueryPipeline;
	currentCameraId = 0;

	constructor(public gfx: Gfx, el: HTMLElement, public seed: number) {
		this.cameras = [
			new FreeCameraController(el, new Camera(gfx)),
			new OrbitCameraController(el, new Camera(gfx)),
		];
		this.queryTerrain = new TerrainHeightQueryPipeline(gfx);
		window.addEventListener('keydown', e => {
			if (e.key === 'Tab') {
				this.currentCameraId = (this.currentCameraId + 1) % this.cameras.length
				this.updateCameras();
			}
		})
		this.updateCameras();
		this.init();
	}

	get activeCamera(): CameraController {
		return this.cameras[this.currentCameraId % this.cameras.length];
	}

	async init() {
		const h = await this.queryTerrain.queryWorldPoint(this.spawnPosition, this.seed);
		for (const camera of this.cameras) {
			camera.camera.position = [0, 6.0 + h, -8];
			camera.camera.rotate(0.15, 0);
		}
		this.spawnPosition[1] = 1.0 + h;
		this.spawnPlayer();
	}

	async update(dt: number) {
		this.player.position[1] = 2 + Math.sin(performance.now() / 1000);

		for (const camera of this.cameras) {
			camera.target = this.player.position;
			camera.update(dt);
		}
	}

	spawnPlayer() {
		this.player.position = [...this.spawnPosition];
	}

	updateCameras() {
		for (const camera of this.cameras) {
			camera.disabled = true;
		}
		this.activeCamera.disabled = false;
	}
}

export class Player {
	position: Point3 = [0, 0, 0];
}
