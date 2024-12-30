import { add, magnitude, normalize, scale, subtract } from 'engine/math/vectors';
import { Gfx } from 'engine';
import { System } from 'engine/ecs/systems';
import { World } from 'engine/ecs/world';
import { PlayerComponent, TransformComponent, VelocityComponent } from 'engine/ecs/components';
import { PhysicsComponent } from 'engine/ecs/components/physics';
import { GravityComponent } from '../components/gravity';
import { Point3, Vector3 } from 'engine/math';
import { Entity } from 'engine/ecs';

export class PhysicsSystem extends System {
	constructor(private gfx: Gfx) {
		super();
	}

	override async tick(dt: number, world: World) {
		const bodies = world.entitiesWithComponents([GravityComponent, TransformComponent]);
		const entities = world.entitiesWithComponents([PhysicsComponent, VelocityComponent, TransformComponent]);

		let wells: Array<[Entity, Point3, Vector3, number]>;

		function refreshWells() {
			wells = Array.from(bodies).map(ent => {
				const { force } = world.getComponent(ent, GravityComponent)!;
				const { position } = world.getComponent(ent, TransformComponent)!;
				const velocity = world.getComponent(ent, VelocityComponent);
				return [ent, position, velocity?.velocity || [0, 0, 0], force];
			});
		}
		refreshWells();

		function updateEntity(entity: Entity) {
			const tra = world.getComponent(entity, TransformComponent)!;
			const vel = world.getComponent(entity, VelocityComponent)!;
			const isPlayer = world.hasComponent(entity, PlayerComponent);

			// Apply velocity
			tra.position = add(tra.position, scale(vel.velocity, dt));

			// Add every well's gravity to velocity
			for (const [ent, position, _, force] of wells) {
				if (ent === entity) continue;
				const gravity = calculateGravity(tra.position, position, force * dt);
				vel.velocity = add(vel.velocity, gravity);
			}

			if (isPlayer) {
				for (const [ent, position, wellVelocity, force] of wells) {
					if (ent === entity) continue;
					const radius = 45.0
					if (hasCollided(tra.position, position, radius)) {
						const normal = normalize(subtract(tra.position, position));
						tra.position = add(position, scale(normal, radius));
						//vel.velocity = add(vel.velocity, scale(normal, dt * 100));
						vel.velocity = [...wellVelocity];
					}
				}
			}
		}

		// Pull everything towards the gravity wells

		// Update gravity wells first to avoid jitter
		const gravities = Array.from(entities).filter(e => world.hasComponent(e, GravityComponent));

		for (const entity of gravities) {
			updateEntity(entity);
		}

		refreshWells();
		const things = Array.from(entities).filter(e => !world.hasComponent(e, GravityComponent));
		for (const entity of things) {
			updateEntity(entity);
		}
	}
}


function calculateGravity(p: Point3, well: Point3, force: number): Vector3 {
	const diff = subtract(well, p);
	const distance = Math.max(10, magnitude(diff));
	if (Math.abs(distance) < 10.0) {
		// FIXME prevents things slingshotting when they reach the singularity
		//return [0, 0, 0];
	}
	const dir = normalize(diff);

	return scale(dir, (1 / (distance ** 2)) * force * 1000);
}
function hasCollided(p0: Point3, p1: Point3, radius: number): boolean {
	return magnitude(subtract(p0, p1)) < radius;
}
