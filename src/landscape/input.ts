import { Camera } from 'engine/camera';
import { Point3, Vector3 } from 'engine/math';
import { multiply, multiplyVector } from 'engine/math/transform';
import { add, scale } from 'engine/math/vectors';
import { DEADZONE, Key, XboxAxis, XboxButton } from 'engine/input';
import { Player } from './player';

export class PlayerController {
	disabled = false;
	gamepads: Array<Gamepad> = [];
	readonly heldKeys = new Map<Key, number>;
	readonly axis = new Map<XboxAxis, number>;
	readonly previousButtons: Record<number, number> = {};
	thrust: number = 0;
	bindings: Record<string, Key> = {
		'w': Key.Forward,
		'a': Key.Left,
		's': Key.Backward,
		'd': Key.Right,
		'q': Key.Down,
		'e': Key.Up,
		'shift': Key.Boost,
		' ': Key.Thrust,
		[XboxButton[XboxButton.LeftBumper]]: Key.Boost,
		[XboxButton[XboxButton.LeftTrigger]]: Key.Brake,
		[XboxButton[XboxButton.RightTrigger]]: Key.Thrust,
		[XboxButton[XboxButton.LeftStick]]: Key.Stable,
		[XboxAxis[XboxAxis.LeftStickX]]: Key.Left,
		[XboxAxis[XboxAxis.LeftStickY]]: Key.Forward,
		[XboxAxis[XboxAxis.RightStickX]]: Key.CameraYaw,
		[XboxAxis[XboxAxis.RightStickY]]: Key.CameraPitch,
	};

	constructor(private el: HTMLElement) {
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
	}

	update(player: Player, camera: Camera, dt: number) {
		if (this.disabled) return;

		this.updateGamepads();

		const speed = this.heldKeys.has(Key.Boost) ? 256 : 16;
		const movement: Vector3 = [0, 0, 0];
		let brake = 0.0;
		let pitch = 0.0;
		let yaw = 0.0;
		this.thrust = 0;
		for (const [key, value] of this.heldKeys.entries()) {
			switch (key) {
				case Key.Forward:
					pitch = value;
					break;
				case Key.Backward:
					pitch = -value;
					break;
				case Key.Left:
					yaw = -value;
					break;
				case Key.Right:
					yaw = value;
					break;
				case Key.Thrust:
					if (Math.abs(value) > DEADZONE) {
						this.thrust = value;
						movement[1] = value;
					}
					break;
				case Key.Brake:
					brake = value;
					break;
				case Key.Stable:
					player.rotation[0] = 0;
					player.rotation[2] = 0;
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
		if (movement[0] !== 0 || movement[1] !== 0 || movement[2] !== 0) {

			const direction = multiplyVector(
				multiply(
					player.rotationMatrix(),
				),
				[...movement, 0]
			);
			const velocity = scale(direction.slice(0, 3) as Point3, speed * dt);
			player.velocity = add(player.velocity, velocity);
		}

		if (brake > 0) {
			const stopTime = 1.0;
			const vt = 1.0 - ((1.0/stopTime) * brake * dt);
			player.velocity = scale(player.velocity, vt);
		}
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
				const key = this.bindings[XboxButton[i]];
				if (button.value > 0.001) {
					if (key) {
						this.heldKeys.set(key, button.value);
					}
				} else {
					this.heldKeys.delete(key);
				}
			}
		}
	}

	onKeyDown = (e: KeyboardEvent) => {
		if (this.disabled) return;
		const key: Key | undefined = this.bindings[e.key.toLowerCase()];
		if (key == null) return;
		this.heldKeys.set(key, 1.0);
	};

	onKeyUp = (e: KeyboardEvent) => {
		const key: Key | undefined = this.bindings[e.key.toLowerCase()];
		if (key == null) return;
		this.heldKeys.delete(key);
	};
}
