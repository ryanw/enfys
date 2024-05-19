import { Gfx } from 'engine';
import { Matrix4, Point3, Vector3 } from './math';
import { identity, transformPoint, inverse, multiply, multiplyVector, perspective, rotation, scaling, translation } from './math/transform';
import { UniformBuffer } from './uniform_buffer';

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

	constructor(readonly gfx: Gfx) {
		this.uniform = new UniformBuffer(gfx, [
			['view', 'mat4x4f'],
			['projection', 'mat4x4f'],
			['resolution', 'vec2f'],
			['t', 'f32'],
		]);
		this.updateView();
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
		this.updateUniform();
	}

	set rotation(rotation: Vector3) {
		this._rotation = [...rotation];
		this.updateUniform();
	}

	set scaling(scaling: Vector3) {
		this._scaling = [...scaling];
		this.updateUniform();
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
		this._projection = perspective(a, 45.0, 1.0, 100000.0);
		this.updateUniform();
	}

	updateUniform() {
		this.uniform.replace({
			view: this.view,
			projection: this.projection,
			resolution: [32, 32],
			t: performance.now() / 1000,
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
		const view = multiply(sca, multiply(tra, rot));
		this._view = inverse(view)!;
		this.updateUniform();
	}
}

