import { Component } from '.';
import { Entity } from '..';

export class CameraComponent extends Component {
}

export class OrbitCameraComponent extends Component {
	constructor(public target?: Entity) {
		super();
	}
}

export class FreeCameraComponent extends Component {
}
