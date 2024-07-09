import { Point3, Vector3 } from 'engine/math';

export abstract class Component { }

export class PlayerComponent extends Component {
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
}
