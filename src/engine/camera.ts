import { Gfx, Triangle, calculateNormal } from 'engine';
import { Matrix4, Plane, Point3, Vector3 } from './math';
import { identity, transformPoint, inverse, multiply, multiplyVector, perspectiveProjection, rotation, scaling, translation, orthographicProjection } from './math/transform';
import { UniformBuffer } from './uniform_buffer';


export type ClippingPlanes = [Plane, Plane, Plane, Plane, Plane, Plane];

/**
 * A camera in 3D space
 */
export class Camera {
	readonly uniform: UniformBuffer;
	private _position: Point3 = [0.0, 0.0, 0.0];
	private _rotation: Vector3 = [0.0, 0.0, 0.0];
	private _scaling: Vector3 = [1.0, 1.0, 1.0];
	private _view: Matrix4 = identity();
	private _projection: Matrix4 = identity();
	private _aspect: number = 1.0;
	private _fov: number = 45.0;
	private _near: number = 1.0;
	private _far: number = 10000.0;

	constructor(readonly gfx: Gfx) {
		this.uniform = new UniformBuffer(gfx, [
			['view', 'mat4x4f'],
			['projection', 'mat4x4f'],
			['resolution', 'vec2f'],
			['t', 'f32'],
			['isShadowMap', 'u32'],
		]);
		this.updateView();
	}

	clippingPlanes(): ClippingPlanes {
		const invProj = inverse(multiply(this.projection, this.view))!;
		const planes = [];
		for (let i = 0; i < 6; i++) {
			const idx = i * 3;
			const triangle: Triangle = [
				transformPoint(invProj, FRUS_PLANE_VERTS[idx + 0]),
				transformPoint(invProj, FRUS_PLANE_VERTS[idx + 1]),
				transformPoint(invProj, FRUS_PLANE_VERTS[idx + 2]),
			];
			planes[i] = [
				triangle[0],
				calculateNormal(triangle),
			];
		}
		return planes as ClippingPlanes;
	}

	get position(): Point3 {
		return [...this._position];
	}

	get rotation(): Vector3 {
		return [...this._rotation];
	}

	get scaling(): Vector3 {
		return [...this._scaling];
	}

	set position(position: Point3) {
		this._position = [...position];
		this.updateView();
	}

	set rotation(rotation: Vector3) {
		this._rotation = [...rotation];
		this.updateView();
	}

	set scaling(scaling: Vector3) {
		this._scaling = [...scaling];
		this.updateView();
	}

	get view(): Matrix4 {
		return [...this._view];
	}

	get projection(): Matrix4 {
		return [...this._projection];
	}

	get aspect(): number {
		return this._aspect;
	}

	set aspect(a: number) {
		this._aspect = a;
		this.rebuildProjection();
	}

	get near(): number {
		return this._near;
	}

	set near(near: number) {
		this._near = near;
		this.rebuildProjection();
	}

	get far(): number {
		return this._far;
	}

	set far(far: number) {
		this._far = far;
		this.rebuildProjection();
	}

	get fov(): number {
		return this._fov;
	}

	set fov(fov: number) {
		this._fov = fov;
		this.rebuildProjection();
	}

	rebuildProjection() {
		this._projection = perspectiveProjection(this._aspect, this._fov, this._near, this._far);
		this.updateView();
	}

	updateUniform() {
		this.uniform.replace({
			view: this.view,
			projection: this.projection,
			resolution: [32, 32],
			t: performance.now() / 1000,
			isShadowMap: false,
		});
	}

	/**
	 * Move the camera relative to its current position
	 * @param direction Direction and amount to move the camera
	 */
	translate(direction: Vector3) {
		const trans = translation(...direction);
		const rot = multiply(
			rotation(0, this._rotation[1], 0),
			rotation(this._rotation[0], 0, 0),
		);
		const invRot = inverse(rot)!;
		const pos = transformPoint(multiply(trans, invRot), this._position);
		this._position = transformPoint(rot, pos);
		this.updateView();
	}

	/**
	 * Rotate the camera
	 * @param pitch Pitch in radians
	 * @param yaw Yaw in radians
	 */
	rotate(pitch: number, yaw: number) {
		if (pitch === 0.0 && yaw === 0.0) return;
		this._rotation[0] += Math.PI * pitch;
		this._rotation[1] += Math.PI * yaw;

		const pad = 0.01;

		if (this._rotation[0] < -Math.PI / 2 + pad) {
			this._rotation[0] = -Math.PI / 2 + pad;
		}
		if (this._rotation[0] > Math.PI / 2 - pad) {
			this._rotation[0] = Math.PI / 2 - pad;
		}
		this.updateView();
	}

	rotationVector(): Vector3 {
		const vec = multiplyVector(this._view, [0.0, 0.0, 1.0, 0.0]);
		return [vec[0], vec[1], vec[2]];
	}

	rotationMatrix(): Matrix4 {
		return multiply(
			rotation(0, 0, this._rotation[2]),
			rotation(0, this._rotation[1], 0),
			rotation(this._rotation[0], 0, 0),
		);
	}

	updateView() {
		const rot = this.rotationMatrix();
		const tra = translation(...this._position);
		const sca = scaling(...this._scaling);
		const view = multiply(tra, rot, sca);
		this._view = inverse(view)!;
		this.updateUniform();
	}
}

export const FRUS_PLANE_VERTS: Array<Point3> = [
	// Left
	[-1, -1, 0],
	[-1, -1, 0.1],
	[-1, 1, 0.1],

	// Right
	[1, -1, 0.1],
	[1, -1, 0],
	[1, 1, 0],

	// Top
	[-1, 1, 0.1],
	[1, 1, 0.1],
	[1, 1, 0],

	// Bottom
	[1, -1, 0.1],
	[-1, -1, 0],
	[1, -1, 0],

	// Near
	[1, -1, 0],
	[-1, -1, 0],
	[-1, 1, 0],

	// Far
	[-1, -1, 1],
	[1, -1, 1],
	[1, 1, 1],
];
