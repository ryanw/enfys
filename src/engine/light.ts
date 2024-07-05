import { Gfx } from "engine";
import { Matrix4, Point3, Vector3 } from "./math";
import { UniformBuffer } from "./uniform_buffer";
import { identity, inverse, multiply, multiplyVector, orthographicProjection, perspectiveProjection, rotation, transformPoint, translation } from "./math/transform";
import { normalize, scale } from "./math/vectors";

export class Light {
	readonly uniform: UniformBuffer;
	private _position: Point3 = [0.0, 0.0, 0.0];
	private _rotation: Vector3 = [0.0, 0.0, 0.0];
	private _view: Matrix4 = identity();
	private _projection: Matrix4 = identity();
	private _aspect: number = 1.0;
	private _fov: number = 45.0;
	private _near: number = 1.0;
	private _far: number = 20000.0;
	private _size: Vector3 = [1, 1, 1];

	constructor(readonly gfx: Gfx) {
		// FIXME must match Camera's uniform structure
		this.uniform = new UniformBuffer(gfx, [
			['view', 'mat4x4f'],
			['projection', 'mat4x4f'],
			['resolution', 'vec2f'],
			['t', 'f32'],
			['isShadowMap', 'u32'],
		]);
		this.rebuildProjection();
		this.updateView();
	}

	get position(): Point3 {
		return [...this._position];
	}

	get rotation(): Vector3 {
		return [...this._rotation];
	}

	get size(): Vector3 {
		return [...this._size];
	}

	set position(position: Point3) {
		this._position = [...position];
		this.updateView();
	}

	set rotation(rotation: Vector3) {
		this._rotation = [...rotation];
		this.updateView();
	}

	set size(size: Vector3) {
		this._size = [...size];
		this.rebuildProjection();
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
		this._projection = orthographicProjection(
			-this._size[0] / 2,
			this._size[0] / 2,
			-this._size[1] / 2,
			this._size[1] / 2,
			this._size[2] + this._size[2]/2,
			-this._size[2] + this._size[2]/2,
		);
		this.updateView();
	}

	updateUniform() {
		this.uniform.replace({
			view: this.view,
			projection: this.projection,
			resolution: [32, 32],
			t: performance.now() / 1000,
			isShadowMap: true,
		});
	}

	updateView() {
		const rot = this.rotationMatrix();
		const tra = translation(...this._position);
		const view = multiply(tra, rot);
		this._view = inverse(view)!;
		this.updateUniform();
	}

	/**
	 * Move the light relative to its current position
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
}

export class PointLight extends Light {
}

export class DirectionalLight extends Light {
	constructor(gfx: Gfx) {
		super(gfx);
	}

	get direction(): Vector3 {
		return normalize(multiplyVector(this.rotationMatrix(), [0, 0, 1, 0]).slice(0, 3) as Vector3);
	}
}
