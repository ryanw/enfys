import { Gfx } from "engine";
import { Key } from ".";
import { Point3, Vector3 } from "engine/math";
import { Camera } from "engine/camera";
import { normalize, scale } from "engine/math/vectors";

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

	onPointerLockChange = (_e: Event) => {
		if (this.disabled) return;
		if (document.pointerLockElement === this.el) {
			document.addEventListener('mousemove', this.onMouseMove);
		} else {
			document.removeEventListener('mousemove', this.onMouseMove);
		}
	};

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
