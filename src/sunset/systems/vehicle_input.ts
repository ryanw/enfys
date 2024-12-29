import { DEADZONE, Key, XboxAxis, XboxButton } from 'engine/input';
import { add, magnitude, scale } from 'engine/math/vectors';
import { Vector3 } from 'engine/math';
import { System } from 'engine/ecs/systems';
import { World } from 'engine/ecs/world';
import { Entity } from 'engine/ecs';
import { VehicleComponent } from '../components/vehicle';
import { EulerTransformComponent, VelocityComponent } from 'engine/ecs/components';

const IDLE_SPEED = 32.0;

export class VehicleInputSystem extends System {
	gamepads: Array<Gamepad> = [];
	readonly heldKeys = new Map<Key, number>;
	readonly pressedKeys = new Map<Key, number>;
	readonly axis = new Map<XboxAxis, number>;
	readonly previousButtons: Record<number, number> = {};
	bindings: Record<string, Key> = {
		'w': Key.Forward,
		'a': Key.Left,
		's': Key.Backward,
		'd': Key.Right,
		'q': Key.Down,
		'e': Key.Up,
		' ': Key.Thrust,
		'shift': Key.Brake,
		[XboxButton[XboxButton.X]]: Key.Fire,
		[XboxButton[XboxButton.LeftTrigger]]: Key.Brake,
		[XboxButton[XboxButton.RightTrigger]]: Key.Thrust,
		[XboxAxis[XboxAxis.LeftStickX]]: Key.Left,
		[XboxAxis[XboxAxis.LeftStickY]]: Key.Forward,
	};

	constructor(private el: HTMLElement) {
		super();
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
	}

	override async tick(dt: number, world: World) {
		const entities = world.entitiesWithComponents([VehicleComponent, VelocityComponent, EulerTransformComponent]);
		for (const entity of entities) {
			this.updateMovement(dt, world, entity);
		}
	}

	updateMovement(dt: number, world: World, entity: Entity) {
		this.updateGamepads();

		const vehicleVelocity = world.getComponent(entity, VelocityComponent)!;

		const accel = 32.0;
		let movement: Vector3 = [0, 0, 0];
		let thrust = 0;

		for (const [key, value] of this.heldKeys.entries()) {
			switch (key) {
				case Key.Forward:
					break;
				case Key.Backward:
					break;
				case Key.Left:
					break;
				case Key.Right:
					break;
				case Key.Thrust:
					if (Math.abs(value) > DEADZONE) {
						thrust = value;
						movement[2] = value * accel;
					}
					break;
				case Key.Brake:
					if (Math.abs(value) > DEADZONE) {
						thrust = value;
						movement[2] = value * -accel;
					}
					break;
				case Key.Fire:
					break;
			}
		}

		if (movement[2] === 0) {
			// Idle, slow down
			const speed = magnitude(vehicleVelocity.velocity);
			if (speed < IDLE_SPEED) {
				movement[2] = IDLE_SPEED;
			}
			else {
				movement = scale(vehicleVelocity.velocity, -1);
			}
		}

		vehicleVelocity.velocity = add(vehicleVelocity.velocity, scale(movement, dt));
	}

	updateGamepads() {
		if (!document.hasFocus()) return;
		for (const pad of navigator.getGamepads()) {
			// We get nulls for some reason
			if (!pad) continue;
			const {
				axes: [
					leftStickX,
					leftStickY,
					rightStickX,
					rightStickY,
				],
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
						this.pressedKeys.set(key, 1.0);
						this.heldKeys.set(key, button.value);
					}
				} else {
					this.heldKeys.delete(key);
				}
			}
		}
	}

	onKeyDown = (e: KeyboardEvent) => {
		const key: Key | undefined = this.bindings[e.key.toLowerCase()];
		if (key == null) return;
		e.preventDefault();
		this.pressedKeys.set(key, 1.0);
		this.heldKeys.set(key, 1.0);
	};

	onKeyUp = (e: KeyboardEvent) => {
		const key: Key | undefined = this.bindings[e.key.toLowerCase()];
		if (key == null) return;
		e.preventDefault();
		this.heldKeys.delete(key);
	};
}
