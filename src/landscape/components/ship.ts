import { Component } from '../../engine/ecs/components';

export enum ShipMode {
	Land,
	Air,
	Water,
	Space,
}

export class ShipComponent extends Component {
	mode: ShipMode = ShipMode.Air;
	surfaceHeight = 0.0;
	hoverGap = 0.5;
}
