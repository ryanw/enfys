import { Gfx, Volume } from 'engine';
import { Matrix4, Point3, Vector3 } from './math';
import { UniformBuffer } from './uniform_buffer';
import { identity, inverse, multiply, multiplyVector, orthographicProjection, perspectiveProjection, rotation, transformPoint, translation } from './math/transform';
import { add, normalize, scale, subtract } from './math/vectors';
import { Camera } from './camera';

export type LightLayer = {
	position: Point3,
	size: Vector3,
	view: Matrix4,
	projection: Matrix4,
};

export class Light {
	readonly uniforms: Array<UniformBuffer> = [];
	readonly layers: Array<LightLayer> = [];
	private _rotation: Vector3 = [0.0, 0.0, 0.0];

	constructor(readonly gfx: Gfx, readonly shadowMapCount: number = 1) {
		for (let i = 0; i < shadowMapCount; i++) {
			this.layers.push({
				position: [0, 0, 0],
				size: [1, 1, 1],
				view: identity(),
				projection: identity(),
			});
			// Must match Camera's uniform structure
			this.uniforms.push(new UniformBuffer(gfx, [
				['view', 'mat4x4f'],
				['projection', 'mat4x4f'],
				['resolution', 'vec2f'],
				['t', 'f32'],
				['isShadowMap', 'u32'],
			]));
		}
		this.rebuildProjections();
	}

	get rotation(): Vector3 {
		return [...this._rotation];
	}

	set rotation(rotation: Vector3) {
		this._rotation = [...rotation];
		this.updateViews();
	}

	rebuildProjections() {
		for (const layer of this.layers) {
			layer.projection = orthographicProjection(
				-layer.size[0] / 2,
				layer.size[0] / 2,
				-layer.size[1] / 2,
				layer.size[1] / 2,
				layer.size[2] + layer.size[2] / 2,
				-layer.size[2] + layer.size[2] / 2,
			);
		}
		this.updateViews();
	}

	updateUniforms() {
		for (let i = 0; i < this.layers.length; i++) {
			const layer = this.layers[i];
			this.uniforms[i].replace({
				view: layer.view,
				projection: layer.projection,
				resolution: [32, 32],
				t: performance.now() / 1000,
				isShadowMap: true,
			});
		}
	}

	updateViews() {
		const rot = this.rotationMatrix();
		for (const layer of this.layers) {
			const tra = translation(...layer.position);
			const view = multiply(tra, rot);
			layer.view = inverse(view)!;
		}
		this.updateUniforms();
	}

	/**
	 * Move the light relative to its current position
	 * @param direction Direction and amount to move the light
	 */
	translate(direction: Vector3) {
		const trans = translation(...direction);
		const rot = multiply(
			rotation(0, this._rotation[1], 0),
			rotation(this._rotation[0], 0, 0),
		);
		const invRot = inverse(rot)!;
		for (const layer of this.layers) {
			const pos = transformPoint(multiply(trans, invRot), layer.position);
			layer.position = transformPoint(rot, pos);
		}
		this.updateViews();
	}

	/**
	 * Rotate the light
	 * @param pitch Pitch in radians
	 * @param yaw Yaw in radians
	 * @param roll Roll in radians
	 */
	rotate(pitch: number, yaw: number = 0.0, roll: number = 0.0) {
		if (pitch === 0.0 && yaw === 0.0 && roll === 0.0) return;
		this._rotation[0] += Math.PI * pitch;
		this._rotation[1] += Math.PI * yaw;
		this._rotation[2] += Math.PI * roll;
		this.updateViews();
	}

	rotationMatrix(): Matrix4 {
		return multiply(
			rotation(0, 0, this._rotation[2]),
			rotation(0, this._rotation[1], 0),
			rotation(this._rotation[0], 0, 0),
		);
	}
}

export class PointLight extends Light {
}

export class DirectionalLight extends Light {
	constructor(gfx: Gfx, layerCount: number = 1) {
		super(gfx, layerCount);
	}

	get direction(): Vector3 {
		return normalize(multiplyVector(this.rotationMatrix(), [0, 0, 1, 0]).slice(0, 3) as Vector3);
	}

	/**
	 * Moves a directional light so it surrounds a camera's view frustum
	 */
	updateForCamera(camera: Camera) {
		const rot = this.rotationMatrix();
		let depth = 0.90;
		for (const layer of this.layers) {
			const shadowVolume = buildLightVolume(camera, rot, depth);
			layer.size = shadowVolume.size;
			layer.position = shadowVolume.position;
			depth += (1.0 - depth) * 0.5;
		}
		this.rebuildProjections();
	}
}

function buildLightVolume(camera: Camera, lightRotation: Matrix4, maxDist: number = 1.0): Volume {
	const invLightRotation = inverse(lightRotation)!;
	const vp = inverse(multiply(camera.projection, camera.view))!;
	let frustum: Array<Point3> = [
		// Left, Bottom, Near
		[-1, -1, 0],
		// Right, Bottom, Near
		[1, -1, 0],
		// Left, Top, Near
		[-1, 1, 0],
		// Right, Top, Near
		[1, 1, 0],
		// Left, Bottom, Far
		[-1, -1, maxDist],
		// Right, Bottom, Far
		[1, -1, maxDist],
		// Left, Top, Far
		[-1, 1, maxDist],
		// Right, Top, Far
		[1, 1, maxDist],
	];
	// Transform unit cube in NDC to frustum corners in world space
	frustum = frustum.map(p => transformPoint(vp, p));

	// Transfrom from world to lightspace
	const points = frustum.map(p => transformPoint(invLightRotation, p));

	// Find bounding box in light space
	const minCoord = [...points[0]];
	const maxCoord = [...points[0]];
	const { min, max } = Math;
	for (const p of points) {
		minCoord[0] = min(minCoord[0], p[0]);
		minCoord[1] = min(minCoord[1], p[1]);
		minCoord[2] = min(minCoord[2], p[2]);
		maxCoord[0] = max(maxCoord[0], p[0]);
		maxCoord[1] = max(maxCoord[1], p[1]);
		maxCoord[2] = max(maxCoord[2], p[2]);
	}

	const size = subtract(maxCoord, minCoord) as Vector3;

	const centre = scale(
		add(
			minCoord as Vector3,
			maxCoord as Vector3,
		),
		0.5,
	) as Point3;

	const transform = lightRotation;
	const origin = transformPoint(lightRotation, centre);

	return { position: origin, size, rotation: transform };
}
