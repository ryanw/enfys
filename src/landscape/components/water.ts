import { Component } from "engine/ecs/components";

export class WaterComponent extends Component {
	constructor(
		public level: number = 0
	) {
		super();
	}
}
