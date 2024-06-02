import { Gfx } from 'engine';
import { Camera } from 'engine/camera';
import { Point3 } from 'engine/math';
import { TerrainHeightQueryPipeline } from './pipelines/terrain_height_query';
import { OrbitCameraController } from 'engine/input/orbit_camera';
import { FreeCameraController } from 'engine/input/free_camera';
import { PlayerController } from './input';
import { Player } from './player';

type CameraController = OrbitCameraController | FreeCameraController;

export class World {
	player = new Player();
	playerController: PlayerController;
	spawnPosition: Point3 = [0, 0, 0];
	cameras: Array<CameraController> = [];
	queryTerrain: TerrainHeightQueryPipeline;
	currentCameraId = 0;

	constructor(public gfx: Gfx, public seed: number) {
		this.queryTerrain = new TerrainHeightQueryPipeline(gfx);
		this.playerController = new PlayerController(gfx.canvas);
		this.cameras = [
			new OrbitCameraController(gfx.canvas, new Camera(gfx)),
			new FreeCameraController(gfx.canvas, new Camera(gfx)),
		];

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
			camera.camera.rotate(0.1, 0);
		}
		this.spawnPosition[1] = 1.0 + h;
		this.spawnPlayer();
	}

	async update(dt: number) {

		this.player.surfaceHeight = await this.queryTerrain.queryWorldPoint(this.player.position, this.seed, true);
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

