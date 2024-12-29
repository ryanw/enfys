import { System } from "engine/ecs/systems";
import { VehicleComponent } from "../components/vehicle";
import { World } from "engine/ecs/world";
import { QueryRoadPipeline, QueryRoadResult } from "../pipelines/query_road";
import { Gfx } from "engine";
import { EulerTransformComponent } from "engine/ecs/components";
import { add, magnitude, scale, subtract } from "engine/math/vectors";
import { Vector3 } from "engine/math";
import { Entity } from "engine/ecs";

export class VehicleSystem extends System {
	private pipeline: QueryRoadPipeline;
	private cache: Map<Entity, QueryRoadResult> = new Map();

	constructor(gfx: Gfx) {
		super();
		this.pipeline = new QueryRoadPipeline(gfx);
	}

	refresh() {
	}

	override async tick(dt: number, world: World) {
		const entities = world.entitiesWithComponents([VehicleComponent, EulerTransformComponent]);
		const b = 32.0;
		let t = dt * b;
		for (const entity of entities) {
			const tra = world.getComponent(entity, EulerTransformComponent)!;

			const result = this.cache.get(entity);
			if (result) {
				const { tangent, offset: [x, y] } = result;
				const tra = world.getComponent(entity, EulerTransformComponent)!;
				const angleY = Math.atan2(-tangent[0], -tangent[2]);
				const angleX = Math.atan2(tangent[1], -tangent[2]);

				const targetPosition: Vector3 = [x - 2.0, y + 6.0, tra.position[2]];
				const targetRotation: Vector3 = [angleX, angleY, 0.0];

				const posDiff = subtract(targetPosition, tra.position);
				if (magnitude(posDiff) > 32.0) {
					tra.position = targetPosition;
					tra.rotation = targetRotation;
				} else {
					tra.position = add(tra.position, scale(posDiff, t));
					const rotDiff = subtract(targetRotation, tra.rotation);
					tra.rotation = add(tra.rotation, scale(rotDiff, t));
				}
			}

			// Update for next frame
			this.pipeline.query(tra.position[2]).then(result => this.cache.set(entity, result));
		}
	}
}
