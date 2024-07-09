import { ResourceId } from "engine/resource";
import { Component } from ".";

export class ParticlesComponent extends Component {
	constructor(
		public meshId: ResourceId,
		public count: number = 256,
	) {
		super();
	}
}
