import { Matrix4, Point3, Quaternion, Vector3 } from 'engine/math';
import { multiply, rotation, rotationFromQuaternion, scaling, translation } from 'engine/math/transform';

export abstract class Component { }

export class NetworkComponent extends Component {
	constructor(
		public prefab: string,
	) {
		super();
	}
}

export class PlayerComponent extends Component {
}

export class GunComponent extends Component {
	constructor(
		public lastFiredAt: number = 0,
		// Shots per second
		public fireRate: number = 4,
	) {
		super();
	}

	canFire(): boolean {
		const delay = 1000 / this.fireRate;
		if (this.lastFiredAt === 0 || (performance.now() - this.lastFiredAt) > delay) {
			return true;
		}
		return false;
	}

	fire() {
		this.lastFiredAt = performance.now();
	}
}

export class VelocityComponent extends Component {
	constructor(
		public velocity: Vector3 = [0, 0, 0],
		public angular: Vector3 = [0, 0, 0],
	) {
		super();
	}
}

export class TransformComponent extends Component {
	/**
	 * Cache transform for faster usage
	 */
	private _transform!: Matrix4;

	constructor(
		private _position: Point3 = [0, 0, 0],
		private _rotation: Quaternion = [0, 0, 0, 1],
		private _scale: Vector3 = [1, 1, 1],
	) {
		super();
		this.updateTransform();
	}

	get position(): Point3 {
		return this._position;
	}

	get rotation(): Quaternion {
		return this._rotation;
	}

	get scale(): Vector3 {
		return this._scale;
	}

	set position(position: Point3) {
		this._position = position;
		this.updateTransform();
	}

	set rotation(rotation: Quaternion) {
		this._rotation = rotation;
		this.updateTransform();
	}

	set scale(scale: Vector3) {
		this._scale = scale;
		this.updateTransform();
	}

	get transform(): Matrix4 {
		return this._transform;
	}

	updateTransform() {
		this._transform = multiply(
			translation(...this.position),
			rotationFromQuaternion(this.rotation),
			scaling(...this.scale),
		);
	}
}

export class EulerTransformComponent extends Component {
	constructor(
		public position: Point3 = [0, 0, 0],
		public rotation: Vector3 = [0, 0, 0],
		public scale: Vector3 = [1, 1, 1],
	) {
		super();
	}

	rotationMatrix(): Matrix4 {
		return multiply(
			rotation(0, 0, this.rotation[2]),
			rotation(0, this.rotation[1], 0),
			rotation(this.rotation[0], 0, 0),
		);
	}

}
