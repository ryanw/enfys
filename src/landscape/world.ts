import { Gfx } from "engine";
import { Camera } from "engine/camera";
import { Point3, Vector3 } from "engine/math";
import { TerrainHeightQueryPipeline } from "./pipelines/terrain_height_query";
import { CameraController, FreeCameraController, OrbitCameraController, PlayerController } from "engine/input";
import { add, scale } from "engine/math/vectors";

export class World {
	player = new Player();
	playerController: PlayerController;
	spawnPosition: Point3 = [0, 0, 0];
	cameras: Array<CameraController> = [];
	queryTerrain: TerrainHeightQueryPipeline;
	currentCameraId = 0;

	constructor(public gfx: Gfx, el: HTMLElement, public seed: number) {
		this.playerController = new PlayerController(el);
		this.cameras = [
			new OrbitCameraController(el, new Camera(gfx)),
			new FreeCameraController(el, new Camera(gfx)),
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
			camera.camera.rotate(0.12, 0);
		}
		this.spawnPosition[1] = 1.0 + h;
		this.spawnPlayer();
	}

	async update(dt: number) {
		this.playerController.update(this.player, this.activeCamera.camera, dt);
		this.player.update(dt);

		for (const camera of this.cameras) {
			camera.target = this.player.position;
			camera.update(dt);
		}
	}

	spawnPlayer() {
		this.player.position = [...this.spawnPosition];
	}

	updateCameras() {
		this.playerController.disabled = !(this.activeCamera instanceof OrbitCameraController);
		for (const camera of this.cameras) {
			camera.disabled = true;
		}
		this.activeCamera.disabled = false;
	}
}

export class Player {
	position: Point3 = [0, 0, 0];
	velocity: Vector3 = [0, 0, 0];
	facing: Vector3 = [0, 0, 1];

	update(dt: number) {
		this.position = add(this.position, scale(this.velocity, dt))
		const vt = 1.0 - (1.0 * dt);
		this.velocity = scale(this.velocity, vt);
	}
}
