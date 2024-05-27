import { Camera } from 'engine/camera';
import { Point3, Vector3 } from 'engine/math';
import { add, normalize, scale } from 'engine/math/vectors';
import { Gfx } from 'engine';
import { multiply, multiplyVector, rotation, transformPoint, translation } from './math/transform';
import { Player } from '../landscape/world';

const DEADZONE = 1.0 / 8.0;

export enum XboxAxis {
	LeftStickX,
	LeftStickY,
	RightStickX,
	RightStickY,
}

export enum XboxButton {
	A,
	B,
	X,
	Y,
	LeftBumper,
	RightBumper,
	LeftTrigger,
	RightTrigger,
	Options,
	Menu,
	LeftStick,
	RightStick,
}

export enum Key {
	Forward,
	Backward,
	Left,
	Right,
	Up,
	Down,
	Boost,
	Thrust,
	Brake,
}

export type CameraController = FreeCameraController | OrbitCameraController;

export class PlayerController {
	disabled = false;
	gamepads: Array<Gamepad> = [];
	readonly heldKeys = new Map<Key, number>;
	readonly axis = new Map<XboxAxis, number>;
	readonly previousButtons: Record<number, number> = {};
	bindings: Record<string, Key> = {
		'w': Key.Forward,
		'a': Key.Left,
		's': Key.Backward,
		'd': Key.Right,
		'q': Key.Down,
		'e': Key.Up,
		'shift': Key.Boost,
		' ': Key.Thrust,
		[XboxButton[XboxButton.LeftTrigger]]: Key.Brake,
		[XboxButton[XboxButton.RightTrigger]]: Key.Thrust,
		[XboxAxis[XboxAxis.LeftStickX]]: Key.Left,
		[XboxAxis[XboxAxis.LeftStickY]]: Key.Forward,
	};

	constructor(private el: HTMLElement) {
		el.addEventListener('mousedown', this.onMouseDown);
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
		window.addEventListener('gamepadconnected', this.onGamepadConnected);
		window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);
	}

	update(player: Player, camera: Camera, dt: number) {
		if (this.disabled) return;

		this.updateGamepads();

		let speed = this.heldKeys.has(Key.Boost) ? 256 : 32;
		const adjustment: Vector3 = [0, 0, 0];
		let pitch = 0.0;
		let yaw = 0.0;
		for (const [key, value] of this.heldKeys.entries()) {
			switch (key) {
				case Key.Forward:
					pitch = value;
					//adjustment[2] = value;
					break;
				case Key.Backward:
					pitch = -value;
					//adjustment[2] = -value;
					break;
				case Key.Left:
					yaw = -value;
					//adjustment[0] = -value;
					break;
				case Key.Right:
					yaw = value;
					//adjustment[0] = value;
					break;
				case Key.Up:
				case Key.Thrust:
					adjustment[1] = value;
					break;
				case Key.Down:
				case Key.Brake:
					adjustment[1] = -value;
					break;
			}
		}
		for (const [key, value] of this.axis.entries()) {
			if (Math.abs(value) < DEADZONE) {
				continue;
			}
			switch (key) {
				case XboxAxis.LeftStickX:
					yaw = value;
					break;
				case XboxAxis.LeftStickY:
					pitch -= value;
					break;
			}
		}

		if (pitch !== 0 || yaw !== 0) {
			player.rotate(pitch * dt, yaw * dt);
		}
		if (adjustment[0] === 0 && adjustment[1] === 0 && adjustment[2] === 0) {
			return;
		}

		const direction = multiplyVector(
			multiply(
				//rotation(0, camera.rotation[1], 0),
				player.rotationMatrix(),
			),
			[...adjustment, 0]
		);

		const velocity = scale(direction.slice(0, 3) as Point3, speed * dt);
		player.velocity = add(player.velocity, velocity);
	}

	updateGamepads() {
		for (const pad of navigator.getGamepads()) {
			// We get nulls for some reason
			if (!pad) continue;
			const {
				axes: [leftStickX, leftStickY, rightStickX, rightStickY],
				buttons,
			} = pad;

			this.axis.set(XboxAxis.LeftStickX, leftStickX);
			this.axis.set(XboxAxis.LeftStickY, leftStickY);
			this.axis.set(XboxAxis.RightStickX, rightStickX);
			this.axis.set(XboxAxis.RightStickY, rightStickY);

			for (let i = 0; i < buttons.length; i++) {
				const button = buttons[i];
				if (this.previousButtons[i] === button.value) {
					// Value unchanged
					continue;
				}
				this.previousButtons[i] = button.value;
				if (button.value > 0.001) {
					const key = this.bindings[XboxButton[i]];
					if (key) {
						this.heldKeys.set(key, button.value);
					}
				} else {
					this.heldKeys.delete(i);
				}
			}
		}
	}

	onMouseDown = (e: MouseEvent) => {
		if (this.disabled) return;
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
		if (this.disabled) return;
		const x = e.movementX / 1000;
		const y = e.movementY / 1000;
	};

	onKeyDown = (e: KeyboardEvent) => {
		if (this.disabled) return;
		const key: Key | undefined = this.bindings[e.key.toLowerCase()];
		if (key == null) return;
		this.heldKeys.set(key, 1.0);
	};

	onKeyUp = (e: KeyboardEvent) => {
		if (this.disabled) return;
		const key: Key | undefined = this.bindings[e.key.toLowerCase()];
		if (key == null) return;
		this.heldKeys.delete(key);
	};

	onGamepadConnected = (e: GamepadEvent) => {
	};

	onGamepadDisconnected = (e: GamepadEvent) => {
	};
}

export class FreeCameraController {
	disabled = false;
	bindings: Record<string, Key> = {
		'w': Key.Forward,
		'a': Key.Left,
		's': Key.Backward,
		'd': Key.Right,
		'q': Key.Down,
		'e': Key.Up,
		'shift': Key.Boost,
	};
	target: Point3 = [0, 0, 0];
	readonly heldKeys = new Set<Key>;
	readonly gfx: Gfx;


	constructor(private el: HTMLElement, public camera: Camera) {
		this.gfx = camera.gfx;
		document.addEventListener('pointerlockchange', this.onPointerLockChange);
		el.addEventListener('mousedown', this.onMouseDown);
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
	}

	grab() {
		this.el.requestPointerLock();
	}

	release() {
		document.exitPointerLock();
	}

	update(dt: number) {
		if (this.disabled) return;
		const speed = this.heldKeys.has(Key.Boost) ? 256 : 32;
		const adjustment: Vector3 = [0, 0, 0];
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
			}
		}

		if (adjustment[0] === 0 && adjustment[1] === 0 && adjustment[2] === 0) {
			return;
		}

		const velocity = scale(normalize(adjustment), speed * dt);
		this.camera.translate(velocity);
	}

	onPointerLockChange = (e: Event) => {
		if (this.disabled) return;
		if (document.pointerLockElement === this.el) {
			document.addEventListener('mousemove', this.onMouseMove);
		} else {
			document.removeEventListener('mousemove', this.onMouseMove);
		}
	}

	onMouseDown = (e: MouseEvent) => {
		if (this.disabled) return;
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
		if (this.disabled) return;
		const x = e.movementX / 1000;
		const y = e.movementY / 1000;
		this.camera.rotate(y, x);
	};

	onKeyDown = (e: KeyboardEvent) => {
		if (this.disabled) return;
		const key: Key | undefined = this.bindings[e.key.toLowerCase()];
		if (key == null) return;
		this.heldKeys.add(key);
	};

	onKeyUp = (e: KeyboardEvent) => {
		if (this.disabled) return;
		const key: Key | undefined = this.bindings[e.key.toLowerCase()];
		if (key == null) return;
		this.heldKeys.delete(key);
	};
}


export class OrbitCameraController {
	disabled = false;
	bindings: Record<string, Key> = {
		'w': Key.Forward,
		'a': Key.Left,
		's': Key.Backward,
		'd': Key.Right,
		'q': Key.Down,
		'e': Key.Up,
		'shift': Key.Boost,
	};
	target: Point3 = [0, 0, 0];
	distance: number = 10;
	readonly heldKeys = new Set<Key>;
	readonly gfx: Gfx;


	constructor(private el: HTMLElement, public camera: Camera) {
		this.gfx = camera.gfx;
		document.addEventListener('pointerlockchange', this.onPointerLockChange);
		el.addEventListener('mousedown', this.onMouseDown);
		el.addEventListener('wheel', this.onWheel);
	}

	grab() {
		this.el.requestPointerLock();
	}

	release() {
		document.exitPointerLock();
	}

	update(dt: number) {
		if (this.disabled) return;
		let transform = translation(...this.target);
		transform = multiply(transform, this.camera.rotationMatrix());
		transform = multiply(transform, translation(0, 0, -this.distance));
		this.camera.position = transformPoint(transform, [0, 1, 0]);
	}

	onPointerLockChange = (e: Event) => {
		if (this.disabled) return;
		if (document.pointerLockElement === this.el) {
			document.addEventListener('mousemove', this.onMouseMove);
		} else {
			document.removeEventListener('mousemove', this.onMouseMove);
		}
	};

	onWheel = (e: WheelEvent) => {
		if (this.disabled) return;
		this.distance *= 1.0 - (e.deltaY / -1000.0);
		this.distance = Math.min(Math.max(this.distance, 5), 200);
	};

	onMouseDown = (e: MouseEvent) => {
		if (this.disabled) return;
		// Ignore press if pointer is locked
		if (document.pointerLockElement === this.el) return;
		if (e.button === 0) {
			document.addEventListener('mouseup', this.onMouseUp);
			document.addEventListener('mousemove', this.onMouseMove);
		}
	};

	onMouseUp = (e: MouseEvent) => {
		// Ignore press if pointer is locked
		if (document.pointerLockElement === this.el) return;
		if (e.button === 0) {
			document.removeEventListener('mouseup', this.onMouseUp);
			document.removeEventListener('mousemove', this.onMouseMove);
		}
	};

	onMouseMove = (e: MouseEvent) => {
		if (this.disabled) return;
		const x = e.movementX / 1000;
		const y = e.movementY / 1000;
		const position = this.camera.position;
		let transform = translation(...position);

		this.camera.rotate(y, x);
	};
}

