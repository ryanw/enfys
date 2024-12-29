import { Vector3 } from 'engine/math';
import { Component } from '.';
import { Entity } from '..';

export class CameraComponent extends Component {
	constructor(
		public useQuaternion: boolean = false
	) {
		super();
	}
}

export class OrbitCameraComponent extends Component {
	constructor(
		public target?: Entity,
		public offset: Vector3 = [0, 0, 0],
	) {
		super();
	}
}

export class FreeCameraComponent extends Component {
}
