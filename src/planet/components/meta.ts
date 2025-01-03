import { Component } from "engine/ecs/components";

export class MetaComponent extends Component {
	constructor(
		public name: string = ""
	) {
		super();
	}
}


