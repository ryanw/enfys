import { Key } from 'engine/input';
import { System } from '.';
import { TransformComponent, VelocityComponent } from '../components';
import { FreeCameraComponent } from '../components/camera';
import { World } from '../world';
import { add, normalize, scale } from 'engine/math/vectors';
import { Vector3 } from 'engine/math';
import { multiply, multiplyVector, rotationFromQuaternion, translation } from 'engine/math/transform';
import * as quats from 'engine/math/quaternions';

export class FreeCameraInputSystem extends System {
	bindings: Record<string, Key> = {
		'w': Key.Forward,
		'a': Key.Left,
		's': Key.Backward,
		'd': Key.Right,
		'q': Key.Down,
		'e': Key.Up,
		'z': Key.RollLeft,
		'x': Key.RollRight,
		'shift': Key.Boost,
	};
	sensitivity: Vector3 = [1, 1, 1];
	readonly heldKeys = new Set<Key>;
	private world?: World;

	constructor(private el: HTMLElement) {
		super();
		document.addEventListener('pointerlockchange', this.onPointerLockChange);
		this.el.addEventListener('mousedown', this.onMouseDown);
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
	}

	override setup(world: World) {
		this.world = world;
	}

	override teardown(_world: World) {
		this.world = undefined;
	}

	override async tick(dt: number, world: World) {
		this.updateMovement(dt, world);
	}

	updateMovement(dt: number, world: World) {
		const speed = this.heldKeys.has(Key.Boost) ? 256 : 64;
		const adjustment: Vector3 = [0, 0, 0];
		let roll = 0;
		for (const key of this.heldKeys) {
			switch (key) {
			case Key.Forward:
				adjustment[2] = 1;
				break;
			case Key.Backward:
				adjustment[2] = -1;
				break;
			case Key.Left:
				adjustment[0] = -1;
				break;
			case Key.Right:
				adjustment[0] = 1;
				break;
			case Key.Up:
				adjustment[1] = 1;
				break;
			case Key.Down:
				adjustment[1] = -1;
				break;
				case Key.RollLeft:
					roll = this.sensitivity[2] * dt;
					if (this.heldKeys.has(Key.Boost)) roll *= 3;
					break;
				case Key.RollRight:
					roll = -this.sensitivity[2] * dt;
					if (this.heldKeys.has(Key.Boost)) roll *= 3;
					break;
			}
		}

		const hasAdjust = !!(adjustment[0] === 0 || adjustment[1] === 0 || adjustment[2] === 0);
		if (roll === 0 && !hasAdjust) {
			return;
		}

		const entities = world.entitiesWithComponents([FreeCameraComponent, TransformComponent]);
		for (const entity of entities) {
			const transform = world.getComponent(entity, TransformComponent)!;
			if (hasAdjust) {
				const direction = multiplyVector(rotationFromQuaternion(transform.rotation), normalize(adjustment));
				const movement = scale(direction, speed * dt);
				transform.position = add(transform.position, movement);
			}
			if (roll) {
				const rot = quats.quaternionFromEuler(0, 0, roll);
				transform.rotation = quats.multiply(transform.rotation, rot);
			}
		}
	}

	rotateCameras(x: number, y: number) {
		const { world } = this;
		if (!world) return;

		const entities = world.entitiesWithComponents([FreeCameraComponent, TransformComponent]);
		for (const entity of entities) {
			const transform = world.getComponent(entity, TransformComponent)!;
			const s = Math.PI;
			const rot = quats.quaternionFromEuler(x * s, y * s, 0);
			transform.rotation = quats.multiply(transform.rotation, rot);
		}
	}

	onPointerLockChange = (_e: Event) => {
		if (document.pointerLockElement === this.el) {
			document.addEventListener('mousemove', this.onMouseMove);
		} else {
			document.removeEventListener('mousemove', this.onMouseMove);
		}
	};

	onMouseDown = (e: MouseEvent) => {
		if (e.button === 0) {
			document.addEventListener('mouseup', this.onMouseUp);
			document.addEventListener('mousemove', this.onMouseMove);
		}
	};

	onMouseUp = (e: MouseEvent) => {
		if (e.button === 0) {
			document.removeEventListener('mouseup', this.onMouseUp);
			document.removeEventListener('mousemove', this.onMouseMove);
		}
	};

	onMouseMove = (e: MouseEvent) => {
		const x = e.movementX / 1000 * this.sensitivity[0];
		const y = e.movementY / 1000 * this.sensitivity[1];
		this.rotateCameras(y, x);
	};

	onKeyDown = (e: KeyboardEvent) => {
		const key: Key | undefined = this.bindings[e.key.toLowerCase()];
		if (key == null) return;
		this.heldKeys.add(key);
	};

	onKeyUp = (e: KeyboardEvent) => {
		const key: Key | undefined = this.bindings[e.key.toLowerCase()];
		if (key == null) return;
		this.heldKeys.delete(key);
	};
}
