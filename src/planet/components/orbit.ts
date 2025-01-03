import { Component } from "engine/ecs/components";
import { Orbit } from "../orbit";
import { Point3 } from "engine/math";

export class OrbitComponent extends Component {
	constructor(
		public orbit: Orbit,
	) {
		super();
	}

	positionAtTime(time: number): Point3 {
		return this.orbit.positionAtTime(time);
	}
}

