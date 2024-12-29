import { add, magnitude, normalize, scale, subtract } from 'engine/math/vectors';
import { Gfx } from 'engine';
import { System } from 'engine/ecs/systems';
import { World } from 'engine/ecs/world';
import { TransformComponent, VelocityComponent } from 'engine/ecs/components';
import { PhysicsComponent } from 'engine/ecs/components/physics';
import { GravityComponent } from '../components/gravity';
import { Point3, Vector3 } from 'engine/math';

export class PhysicsSystem extends System {
	constructor(private gfx: Gfx) {
		super();
	}

	override async tick(dt: number, world: World) {
		const bodies = world.entitiesWithComponents([GravityComponent, TransformComponent]);
		const entities = world.entitiesWithComponents([PhysicsComponent, VelocityComponent, TransformComponent]);

		const wells: Array<[Point3, number]> = Array.from(bodies).map(ent => {
			const { force } = world.getComponent(ent, GravityComponent)!;
			const { position } = world.getComponent(ent, TransformComponent)!;
			return [position, force];
		});

		// Pull everything towards the gravity wells
		for (const entity of entities) {
			const tra = world.getComponent(entity, TransformComponent)!;
			const vel = world.getComponent(entity, VelocityComponent)!;

			// Add every well's gravity to velocity
			for (const [position, force] of wells) {
				const gravity = calculateGravity(tra.position, position, force * dt);
				vel.velocity = add(vel.velocity, gravity);
			}

			// Apply velocity
			tra.position = add(tra.position, scale(vel.velocity, dt));

		}
	}
}


function calculateGravity(p: Point3, well: Point3, force: number): Vector3 {
	const diff = subtract(well, p);
	const distance = Math.max(10, magnitude(diff));
	const dir = normalize(diff);

	return scale(dir, (1 / (distance ** 2)) * force * 1000);
}
