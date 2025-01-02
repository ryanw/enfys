import { System } from "engine/ecs/systems";
import { World } from "engine/ecs/world";
import { EulerTransformComponent } from "engine/ecs/components";
import { FollowComponent } from "../components/follow";
import { Entity } from "engine/ecs";
import { Vector3 } from "engine/math";

export class FollowSystem extends System {
	private origins: Map<Entity, Vector3> = new Map();

	override async tick(dt: number, world: World) {
		const entities = world.entitiesWithComponents([FollowComponent, EulerTransformComponent]);
		for (const entity of entities) {
			const { target, axis } = world.getComponent(entity, FollowComponent)!;
			if (!target) continue;


			const srcTra = world.getComponent(target, EulerTransformComponent)!;
			const dstTra = world.getComponent(entity, EulerTransformComponent)!;

			if (!this.origins.has(entity)) {
				this.origins.set(entity, [...dstTra.position]);
			}
			const origin = this.origins.get(entity)!;

			axis.forEach((a, i) => {
				if (a > 0) {
					dstTra.position[i] = srcTra.position[i] + origin[i];
				}
			});
		}
	}
}
