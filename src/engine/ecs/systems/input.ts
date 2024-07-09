import { System } from '.';
import { TransformComponent } from '../components';
import { World } from '../world';

export class InputSystem extends System {
	override async tick(dt: number, world: World) {
		const entities = world.entitiesWithComponents([TransformComponent]);
	}
}
