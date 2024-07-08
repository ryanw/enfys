import { Component } from ".";

export enum LightKind {
	Directional,
	Point,
}

export class LightComponent extends Component {
	kind = LightKind.Directional
}
