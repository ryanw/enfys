import { Matrix4, Point3, Vector3 } from "engine/math";
import { rotation } from "engine/math/transform";
import { add, magnitude, scale } from "engine/math/vectors";

const UNITS_PER_METER = 1.0;

export class Player {
	position: Point3 = [0, 0, 0];
	velocity: Vector3 = [0, 0, 0];
	rotation: Vector3 = [0, 0, 0];
	surfaceHeight = 0.0;
	hoverGap = 0.5;

	rotate(pitch: number, yaw: number) {
		this.rotation[0] += Math.PI * pitch;
		this.rotation[1] += Math.PI * yaw;
	}

	rotationMatrix(): Matrix4 {
		return rotation(this.rotation[0], this.rotation[1], 0);
	}

	update(dt: number) {
		this.velocity[1] -= 8.0 * dt;
		this.position = add(this.position, scale(this.velocity, dt));

		const speed = magnitude(this.velocity);

		const targetHeight = this.surfaceHeight + this.hoverGap;

		if (this.position[1] < targetHeight) {
			// Hit the surface!
			if (speed > 8.0) {
				console.log("DEAD!", speed);
				this.velocity = [0, 0, 0];
			}

			if (this.velocity[1] < 0) {
				// Bounce
				this.velocity[1] = -(this.velocity[1] * 0.25);
			}

			const diff = targetHeight - this.position[1];
			// Speed to adjust ship height
			const collideSpeed = Math.max(32.0, speed);
			const step = collideSpeed * dt;
			if (diff < step) {
				this.position[1] = targetHeight;
			}
			else {
				this.position[1] += step;
			}
		}

		// Dampening
		const vt = 1.0 - (0.333 * dt);
		const scaled = scale(this.velocity, vt);;
		this.velocity[0] = scaled[0];
		this.velocity[2] = scaled[2];
		if (DEBUG) {
			// speed in units per second
			const speedU = magnitude(this.velocity);
			// speed in meters per hour
			const speed = (speedU * UNITS_PER_METER) * 3600;
			const kph = speed / 1000;
			console.log("Current velocity: %f kph", kph.toPrecision(4));
		}
	}
}

