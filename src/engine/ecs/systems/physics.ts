import { add, scale } from "engine/math/vectors";
import { System } from ".";
import { World } from "../world";
import { TransformComponent, VelocityComponent } from "../components";

export class PhysicsSystem extends System {
	override async tick(dt: number, world: World) {
		const entities = world.entitiesWithComponents([VelocityComponent, TransformComponent]);
		for (const entity of entities) {
			const tra = world.getComponent(entity, TransformComponent)!;
			const vel = world.getComponent(entity, VelocityComponent)!;
			tra.position = add(tra.position, scale(vel.velocity, dt));
		}
	}
}
