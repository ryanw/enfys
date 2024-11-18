import { System } from "engine/ecs/systems";
import { VehicleComponent } from "../components/vehicle";
import { World } from "engine/ecs/world";
import { QueryRoadPipeline } from "../pipelines/query_road";
import { Gfx } from "engine";
import { TransformComponent } from "engine/ecs/components";
import { add, magnitude, scale, subtract } from "engine/math/vectors";
import { Vector3 } from "engine/math";

export class VehicleSystem extends System {
	private pipeline: QueryRoadPipeline;

	constructor(gfx: Gfx) {
		super();
		this.pipeline = new QueryRoadPipeline(gfx);
	}

	refresh() {
	}

	override async tick(dt: number, world: World) {
		const entities = world.entitiesWithComponents([VehicleComponent, TransformComponent]);
		const b = 4.0;
		let t = dt * b;
		for (const entity of entities) {
			const tra = world.getComponent(entity, TransformComponent)!;

			this.pipeline.query(tra.position[2]).then(({ tangent, x }) => {
				const tra = world.getComponent(entity, TransformComponent)!;
				const angle = Math.atan2(-tangent[0], -tangent[1]);

				const targetPosition: Vector3 = [x - 2.0, tra.position[1], tra.position[2]];
				const targetRotation: Vector3 = [0.0, angle, 0.0];

				const posDiff = subtract(targetPosition, tra.position);
				if (magnitude(posDiff) > 10.0) {
					tra.position = targetPosition;
					tra.rotation = targetRotation;
				} else {
					tra.position = add(tra.position, scale(posDiff, t));
					const rotDiff = subtract(targetRotation, tra.rotation);
					tra.rotation = add(tra.rotation, scale(rotDiff, t));
				}
			});
		}
	}
}
