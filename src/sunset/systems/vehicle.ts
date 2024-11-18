import { System } from "engine/ecs/systems";
import { VehicleComponent } from "../components/vehicle";
import { World } from "engine/ecs/world";
import { QueryRoadPipeline } from "../pipelines/query_road";
import { Gfx } from "engine";
import { TransformComponent } from "engine/ecs/components";
import { add, scale, subtract } from "engine/math/vectors";
import { Vector3 } from "engine/math";

export class VehicleSystem extends System {
	private pipeline: QueryRoadPipeline;

	constructor(gfx: Gfx) {
		super();
		this.pipeline = new QueryRoadPipeline(gfx);
	}
	override async tick(dt: number, world: World) {
		const entities = world.entitiesWithComponents([VehicleComponent, TransformComponent]);
		const b = 10.0;
		let t = dt * b;
		for (const entity of entities) {
			const veh = world.getComponent(entity, VehicleComponent)!;
			const tra = world.getComponent(entity, TransformComponent)!;

			const { tangent, x } = await this.pipeline.query(tra.position[2]);
			const angle = Math.atan2(-tangent[0], -tangent[1]);

			const targetPosition: Vector3 = [x - 2.0, tra.position[1], tra.position[2]];
			const posDiff = subtract(targetPosition, tra.position);
			tra.position = add(tra.position, scale(posDiff, t));

			const targetRotation: Vector3 = [0.0, angle, 0.0];
			const rotDiff = subtract(targetRotation, tra.rotation);
			tra.rotation = add(tra.rotation, scale(rotDiff, t));
		}
	}
}
