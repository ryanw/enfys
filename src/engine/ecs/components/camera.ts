import { Quaternion, Vector3 } from 'engine/math';
import { Component } from '.';
import { Entity } from '..';

export class CameraComponent extends Component {
	constructor(
		public near: number = 1.0,
		public far: number = 10000.0,
	) {
		super();
	}
}

export class OrbitCameraComponent extends Component {
	constructor(
		public target?: Entity,
		public distance: number = 16,
		public offset: Vector3 = [0, 0, 0],
		public rotation: Quaternion = [0, 0, 0, 1],
	) {
		super();
	}
}

export class FollowCameraComponent extends Component {
	constructor(
		public target?: Entity,
		public distance: number = 16,
		public offset: Vector3 = [0, 0, 0],
		public rotation: Quaternion = [0, 0, 0, 1],
	) {
		super();
	}
}

export class FreeCameraComponent extends Component {
}
