import { Matrix4, Point3, Vector3 } from "engine/math";
import { rotation } from "engine/math/transform";
import { add, magnitude, scale } from "engine/math/vectors";

export class Player {
	position: Point3 = [0, 0, 0];
	velocity: Vector3 = [0, 0, 0];
	rotation: Vector3 = [0, 0, 0];
	surfaceHeight = 0.0;
	hoverGap = 1.0;

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

		if (this.position[1] < this.surfaceHeight + this.hoverGap) {
			// Hit the surface!
			if (speed > 16.0) {
				console.log("DEAD!", speed);
			}

			this.velocity[1] = 0.0;

			const diff = (this.surfaceHeight + this.hoverGap) - this.position[1];
			if (diff < 0.01) {
				this.position[1] = this.surfaceHeight + this.hoverGap;
			}
			else {
				const time = 0.1;
				this.position[1] += diff * (1.0 / time * dt);
			}
		}

		// Dampening
		const vt = 1.0 - (1.0 * dt);
		const scaled = scale(this.velocity, vt);;
		this.velocity[0] = scaled[0];
		this.velocity[2] = scaled[2];
	}
}

