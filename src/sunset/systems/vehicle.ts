import { System } from "engine/ecs/systems";
import { VehicleComponent } from "../components/vehicle";
import { World } from "engine/ecs/world";

export class VehicleSystem extends System {
	override async tick(dt: number, world: World) {
		const entities = world.entitiesWithComponents([VehicleComponent]);
		for (const entity of entities) {
			const veh = world.getComponent(entity, VehicleComponent)!;
		}
	}
}
