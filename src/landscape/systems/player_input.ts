import { DEADZONE, Key, XboxAxis, XboxButton } from 'engine/input';
import { add, normalize, scale } from 'engine/math/vectors';
import { Point3, Vector3 } from 'engine/math';
import { multiply, multiplyVector, rotation } from 'engine/math/transform';
import { System } from 'engine/ecs/systems';
import { World } from 'engine/ecs/world';
import { PlayerComponent, TransformComponent, VelocityComponent } from 'engine/ecs/components';
import { ShipComponent, ShipMode } from '../components/ship';
import { Entity } from 'engine/ecs';
import { ParticlesComponent } from 'engine/ecs/components/particles';

export class PlayerInputSystem extends System {
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
		'shift': Key.Boost,
		'r': Key.ToggleMode,
		',': Key.PrevCamera,
		'.': Key.NextCamera,
		' ': Key.Thrust,
		[XboxButton[XboxButton.Y]]: Key.ToggleMode,
		[XboxButton[XboxButton.X]]: Key.Fire,
		[XboxButton[XboxButton.A]]: Key.Pick,
		[XboxButton[XboxButton.B]]: Key.Bomb,
		[XboxButton[XboxButton.LeftBumper]]: Key.Boost,
		[XboxButton[XboxButton.LeftTrigger]]: Key.Brake,
		[XboxButton[XboxButton.RightTrigger]]: Key.Thrust,
		[XboxButton[XboxButton.LeftStick]]: Key.Stable,
		[XboxAxis[XboxAxis.LeftStickX]]: Key.Left,
		[XboxAxis[XboxAxis.LeftStickY]]: Key.Forward,
		[XboxAxis[XboxAxis.RightStickX]]: Key.CameraYaw,
		[XboxAxis[XboxAxis.RightStickY]]: Key.CameraPitch,
	};
	private world?: World;

	constructor(private el: HTMLElement) {
		super();
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
		const entities = world.entitiesWithComponents([PlayerComponent, ShipComponent, VelocityComponent, TransformComponent]);
		for (const entity of entities) {
			this.updateMovement(dt, world, entity);
		}
	}

	updateMovement(dt: number, world: World, entity: Entity) {
		this.updateGamepads();

		const ship = world.getComponent(entity, ShipComponent)!;
		const transform = world.getComponent(entity, TransformComponent)!;

		for (const [key, _amount] of this.pressedKeys) {
			switch (key) {
			case Key.ToggleMode:
				switch (ship.mode) {
				case ShipMode.Air:
					transform.rotation[0] = 0;
					ship.mode = ShipMode.Land;
					break;
				case ShipMode.Land:
					ship.mode = ShipMode.Air;
					break;
				}
				break;
			}
		}

		switch (ship.mode) {
		case ShipMode.Air:
			this.updateModeAir(dt, world, entity);
			break;

		case ShipMode.Land:
			this.updateModeLand(dt, world, entity);
			break;

		case ShipMode.Water:
			break;

		case ShipMode.Space:
			break;
		}


		this.pressedKeys.clear();
	}

	updateModeLand(dt: number, world: World, entity: Entity) {
		const transform = world.getComponent(entity, TransformComponent)!;
		const playerVelocity = world.getComponent(entity, VelocityComponent)!;
		const particles = world.getComponent(entity, ParticlesComponent);

		const speed = this.heldKeys.has(Key.Boost) ? 256 : 10;
		const rotateSpeed = 4.0;
		const movement: Vector3 = [0, 0, 0];
		let brake = 0.0;
		const pitch = 0.0;
		let yaw = 0.0;
		let thrust = 0;

		for (const [key, value] of this.heldKeys.entries()) {
			switch (key) {
			case Key.Forward:
				break;
			case Key.Backward:
				break;
			case Key.Left:
				yaw = -value;
				break;
			case Key.Right:
				yaw = value;
				break;
			case Key.Thrust:
				if (Math.abs(value) > DEADZONE) {
					thrust = value;

					movement[2] = value;
				}
				break;
			case Key.Brake:
				brake = value;
				break;
			case Key.Stable:
				transform.rotation[0] = 0;
				transform.rotation[2] = 0;
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
				break;
			}
		}

		transform.rotation = add(transform.rotation, [pitch * dt * rotateSpeed, yaw * dt * rotateSpeed, 0]);

		if (movement[0] !== 0 || movement[1] !== 0 || movement[2] !== 0) {
			const playerRotationMatrix = multiply(
				rotation(0, 0, transform.rotation[2]),
				rotation(0, transform.rotation[1], 0),
				rotation(transform.rotation[0], 0, 0),
			);

			const direction = multiplyVector(playerRotationMatrix, [...movement, 0]).slice(0, 3) as Vector3;
			const velocity = scale(direction, speed * dt);
			playerVelocity.velocity = add(playerVelocity.velocity, velocity);
		}

		if (brake > 0) {
			const stopTime = 1.0 / 10.0;
			const vt = 1.0 - ((1.0 / stopTime) * brake * dt);
			playerVelocity.velocity = scale(playerVelocity.velocity, vt);
		}

		if (particles) {
			particles.count = 256 * thrust;
		}
	}

	updateModeAir(dt: number, world: World, entity: Entity) {
		const transform = world.getComponent(entity, TransformComponent)!;
		const playerVelocity = world.getComponent(entity, VelocityComponent)!;
		const particles = world.getComponent(entity, ParticlesComponent);

		const speed = this.heldKeys.has(Key.Boost) ? 256 : 16;
		const rotateSpeed = 4.0;
		const movement: Vector3 = [0, 0, 0];
		let brake = 0.0;
		let pitch = 0.0;
		let yaw = 0.0;
		let thrust = 0;

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
					thrust = value;

					movement[1] = value;
				}
				break;
			case Key.Brake:
				brake = value;
				break;
			case Key.Stable:
				transform.rotation[0] = 0;
				transform.rotation[2] = 0;
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

		transform.rotation = add(transform.rotation, [pitch * dt * rotateSpeed, yaw * dt * rotateSpeed, 0]);

		if (movement[0] !== 0 || movement[1] !== 0 || movement[2] !== 0) {
			const playerRotationMatrix = multiply(
				rotation(0, 0, transform.rotation[2]),
				rotation(0, transform.rotation[1], 0),
				rotation(transform.rotation[0], 0, 0),
			);

			const direction = multiplyVector(playerRotationMatrix, [...movement, 0]).slice(0, 3) as Vector3;
			const velocity = scale(direction, speed * dt);
			playerVelocity.velocity = add(playerVelocity.velocity, velocity);
		}

		if (brake > 0) {
			const stopTime = 1.0;
			const vt = 1.0 - ((1.0 / stopTime) * brake * dt);
			playerVelocity.velocity = scale(playerVelocity.velocity, vt);
		}

		if (particles) {
			particles.count = 256 * thrust;
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
		this.pressedKeys.set(key, 1.0);
		this.heldKeys.set(key, 1.0);
	};

	onKeyUp = (e: KeyboardEvent) => {
		const key: Key | undefined = this.bindings[e.key.toLowerCase()];
		if (key == null) return;
		this.heldKeys.delete(key);
	};
}
