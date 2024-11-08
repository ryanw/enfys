import { System } from "engine/ecs/systems";
import { World } from "engine/ecs/world";
import * as vec from "engine/math/vectors";
import { TransformComponent, VelocityComponent } from "engine/ecs/components";

export class SimplePhysicsSystem extends System {
	override async tick(dt: number, world: World) {
		const entities = world.entitiesWithComponents([VelocityComponent, TransformComponent]);
		for (const entity of entities) {
			const vel = world.getComponent(entity, VelocityComponent)!;
			const tra = world.getComponent(entity, TransformComponent)!;
			tra.position = vec.add(tra.position, vec.scale(vel.velocity, dt));
		}
	}
}
