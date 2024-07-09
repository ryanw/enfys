import { ResourceId } from 'engine/resource';
import { Component } from '.';

export class MeshComponent extends Component {
	constructor(
		public meshId: ResourceId
	) {
		super();
	}
}
