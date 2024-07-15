import { System } from "engine/ecs/systems";
import { World } from "engine/ecs/world";
import { InsectComponent, InsectMode } from "../components/insect";
import { TransformComponent, VelocityComponent } from "engine/ecs/components";
import { randomizer } from "engine/noise";
import { add, magnitude, normalize, scale, subtract } from "engine/math/vectors";
import { Point3 } from "engine/math";
import { PhysicsComponent } from "engine/ecs/components/physics";

export class InsectAISystem extends System {
	async tick(dt: number, world: World) {
		const { atan2, abs, PI } = Math;
		const entities = world.entitiesWithComponents([InsectComponent, PhysicsComponent, VelocityComponent, TransformComponent]);
		for (const entity of entities) {
			const rnd = randomizer(entity + performance.now());
			const tra = world.getComponent(entity, TransformComponent)!;
			const vel = world.getComponent(entity, VelocityComponent)!;
			const bug = world.getComponent(entity, InsectComponent)!;
			const phy = world.getComponent(entity, PhysicsComponent)!;

			switch (bug.mode) {
				case InsectMode.Idle:
					bug.mode = InsectMode.Searching;
					break;

				case InsectMode.Searching:
					const range = [10, 20];
					let n0 = rnd(...range);
					let n1 = rnd(...range);
					if (rnd() < 0.5) n0 *= -1;
					if (rnd() < 0.5) n1 *= -1;
					bug.target = add<Point3>(tra.position, [n0, 0, n1])
					bug.mode = InsectMode.Navigating;
					break;

				case InsectMode.Navigating:
					// Can't move without a target, or while in the air
					if (!bug.target) {
						bug.mode = InsectMode.Searching;
						continue;
					}
					if (!phy.grounded) {
						continue;
					}
					const diff = subtract(bug.target, tra.position);
					const dist = magnitude(diff);
					const dir = normalize(diff);
					if (abs(dist) < 10.0) {
						bug.mode = InsectMode.Searching;
						continue;
					}
					vel.velocity = add(vel.velocity, scale(dir, 0.2));
					const move = normalize(vel.velocity);
					tra.rotation = [0, atan2(move[2], -move[0]) - PI/2, 0];
					break;

				case InsectMode.Dead:
					break;
			}
		}
	}
}
