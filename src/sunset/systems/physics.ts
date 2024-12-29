import { System } from "engine/ecs/systems";
import { World } from "engine/ecs/world";
import * as vec from "engine/math/vectors";
import { EulerTransformComponent, VelocityComponent } from "engine/ecs/components";

export class SimplePhysicsSystem extends System {
	override async tick(dt: number, world: World) {
		const entities = world.entitiesWithComponents([VelocityComponent, EulerTransformComponent]);
		for (const entity of entities) {
			const vel = world.getComponent(entity, VelocityComponent)!;
			const tra = world.getComponent(entity, EulerTransformComponent)!;
			tra.position = vec.add(tra.position, vec.scale(vel.velocity, dt));
			tra.rotation = vec.add(tra.rotation, vec.scale(vel.angular, dt));
		}
	}
}
