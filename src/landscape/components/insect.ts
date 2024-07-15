import { Point3 } from 'engine/math';
import { Component } from '../../engine/ecs/components';

export enum InsectMode {
	Idle,
	Searching,
	Navigating,
	Dead,
}

export class InsectComponent extends Component {
	mode: InsectMode = InsectMode.Idle;
	target?: Point3;
	surfaceHeight = 0.0;
}

