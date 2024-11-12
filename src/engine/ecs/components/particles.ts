import { ResourceId } from 'engine/resource';
import { Component } from '.';
import { Vector3 } from 'engine/math';

export class ParticlesComponent extends Component {
	constructor(
		public meshId: ResourceId,
		public count: number = 256,
		public emissive: boolean = false,
		public offset: Vector3 = [0,0,0],
	) {
		super();
	}
}
