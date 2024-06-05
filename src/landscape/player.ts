import { Matrix4, Point3, Vector3 } from "engine/math";
import { rotation } from "engine/math/transform";
import { add, magnitude, scale } from "engine/math/vectors";

export class Player {
	position: Point3 = [0, 0, 0];
	velocity: Vector3 = [0, 0, 0];
	rotation: Vector3 = [0, 0, 0];
	surfaceHeight = 0.0;
	hoverGap = 0.2;

	rotate(pitch: number, yaw: number) {
		this.rotation[0] += Math.PI * pitch;
		this.rotation[1] += Math.PI * yaw;
	}

	rotationMatrix(): Matrix4 {
		return rotation(this.rotation[0], this.rotation[1], 0);
	}

	update(dt: number) {
		// Add gravity -- approx Earth gravity
		this.velocity[1] -= 10.0 * dt;
		this.position = add(this.position, scale(this.velocity, dt));

		const speed = magnitude(this.velocity);

		const targetHeight = this.surfaceHeight + this.hoverGap;

		if (this.position[1] < targetHeight) {
			// Hit the surface!
			if (speed > 8.0) {
				console.log("DEAD!", speed);
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
	}
}

