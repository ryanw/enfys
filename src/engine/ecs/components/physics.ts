import { Component } from ".";

export class PhysicsComponent extends Component {
	constructor(
		public gravityMultiplier = 1.0,
		public frictionMultiplier = 1.0,
		public grounded = false,
	) {
		super();
	}
}
