import { Entity } from "engine/ecs";
import { Component } from "engine/ecs/components";
import { Vector3 } from "engine/math";

export class FollowComponent extends Component {
	constructor(
		public target?: Entity,
		public axis: Vector3 = [1, 1, 1],
	) {
		super();
	}
}
