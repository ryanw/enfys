import { Gfx } from 'engine';
import { Camera } from 'engine/camera';
import { Matrix4, Point3, Vector3 } from 'engine/math';
import { TerrainHeightQueryPipeline } from './pipelines/terrain_height_query';
import { add, scale } from 'engine/math/vectors';
import { rotation } from 'engine/math/transform';
import { OrbitCameraController } from 'engine/input/orbit_camera';
import { FreeCameraController } from 'engine/input/free_camera';
import { PlayerController } from './input';

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

export class Player {
	position: Point3 = [0, 0, 0];
	velocity: Vector3 = [0, 0, 0];
	rotation: Vector3 = [0, 0, 0];
	surfaceHeight = 0.0;
	hoverGap = 1.0;

	rotate(pitch: number, yaw: number) {
		this.rotation[0] += Math.PI * pitch;
		this.rotation[1] += Math.PI * yaw;

		const pad = 0.01;

		if (this.rotation[0] < -Math.PI / 2 + pad) {
			this.rotation[0] = -Math.PI / 2 + pad;
		}
		if (this.rotation[0] > Math.PI / 2 - pad) {
			this.rotation[0] = Math.PI / 2 - pad;
		}
	}

	rotationMatrix(): Matrix4 {
		return rotation(this.rotation[0], this.rotation[1], 0);
	}

	update(dt: number) {
		// Add gravity -- approx Earth gravity
		this.velocity[1] -= 10.0 * dt;
		this.position = add(this.position, scale(this.velocity, dt));
		if (this.position[1] < this.surfaceHeight + this.hoverGap) {
			this.velocity[1] = 0.0;

			const diff = (this.surfaceHeight + this.hoverGap) - this.position[1];
			if (diff < 0.01) {
				this.position[1] = this.surfaceHeight + this.hoverGap;
			}
			else {
				const time = 0.1;
				this.position[1] += diff * (1.0/time * dt);
			}
		}

		// Dampening
		const vt = 1.0 - (1.0 * dt);
		const scaled = scale(this.velocity, vt);;
		this.velocity[0] = scaled[0];
		this.velocity[2] = scaled[2];
	}
}
