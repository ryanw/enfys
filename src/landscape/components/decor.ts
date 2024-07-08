import { Entity } from "engine/ecs";
import { Component } from "engine/ecs/components";
import { ResourceId } from "engine/resource";

export class DecorComponent extends Component {
	constructor(
		public meshId: ResourceId,
		public seed: number,
		public spread: number = 8,
		public radius: number = 3,
		public target?: Entity,
	) {
		super();
	}
}
