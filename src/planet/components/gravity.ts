import { Component } from "engine/ecs/components";

export class GravityComponent extends Component {
	constructor(
		public force: number = 1,
	) {
		super();
	}
}

