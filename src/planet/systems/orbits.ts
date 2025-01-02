import { add, dot, lerp, magnitude, normalize, scale, subtract } from 'engine/math/vectors';
import { Gfx } from 'engine';
import { System } from 'engine/ecs/systems';
import { World } from 'engine/ecs/world';
import { TransformComponent, VelocityComponent } from 'engine/ecs/components';
import { GravityComponent } from '../components/gravity';
import { ColliderComponent } from 'engine/ecs/components/collider';
import { OrbitComponent } from '../components/orbit';

export class OrbitsSystem extends System {
	constructor() {
		super();
	}

	override async tick(dt: number, world: World) {
		const bodies = world.entitiesWithComponents([TransformComponent]);
		const planets = world.entitiesWithComponents([OrbitComponent, VelocityComponent, TransformComponent]);

		for (const entity of planets) {
			const t = world.getComponent(entity, TransformComponent)!;
			const orbit = world.getComponent(entity, OrbitComponent)!;
			t.position = orbit.positionAtTime(performance.now()/10000.0);
		}
	}
}
