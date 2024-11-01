import { Matrix4, Point3, Vector3 } from 'engine/math';
import { multiply, rotation } from 'engine/math/transform';

export abstract class Component { }

export class NetworkComponent extends Component {
	constructor(
		public remoteId?: number,
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
	) {
		super();
	}
}

export class TransformComponent extends Component {
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
