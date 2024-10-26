import { ResourceId } from 'engine/resource';
import { Component } from '.';

export class SoundComponent extends Component {
	constructor(
		public soundId: ResourceId,
		public playing: boolean = true,
		public volume: number = 1,
		public loop: boolean = false,
	) {
		super();
	}
}

