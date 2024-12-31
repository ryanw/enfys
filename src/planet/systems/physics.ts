import { add, dot, lerp, magnitude, normalize, scale, subtract } from 'engine/math/vectors';
import { Gfx } from 'engine';
import { System } from 'engine/ecs/systems';
import { World } from 'engine/ecs/world';
import { PlayerComponent, TransformComponent, VelocityComponent } from 'engine/ecs/components';
import { PhysicsComponent } from 'engine/ecs/components/physics';
import { GravityComponent } from '../components/gravity';
import { Point3, Vector3 } from 'engine/math';
import { Entity } from 'engine/ecs';
import { ColliderComponent } from 'engine/ecs/components/collider';

interface Planet {
	entity: Entity;
	position: Point3;
	velocity: Vector3;
	radius: number;
	force: number;
}

export class PhysicsSystem extends System {
	constructor(private gfx: Gfx) {
		super();
	}

	override async tick(dt: number, world: World) {
		const bodies = world.entitiesWithComponents([GravityComponent, TransformComponent]);
		const entities = world.entitiesWithComponents([PhysicsComponent, VelocityComponent, TransformComponent]);

		let planets: Array<Planet>;

		function refreshPlanets() {
			planets = Array.from(bodies).map(ent => {
				const { force } = world.getComponent(ent, GravityComponent)!;
				const { position } = world.getComponent(ent, TransformComponent)!;
				const collider = world.getComponent(ent, ColliderComponent);
				const velocity = world.getComponent(ent, VelocityComponent);
				return {
					entity: ent,
					position,
					velocity: velocity?.velocity || [0, 0, 0],
					force,
					radius: collider?.radius ?? 10
				};
			});
		}
		refreshPlanets();

		function updateEntity(entity: Entity) {
			const { max, min } = Math;
			const tra = world.getComponent(entity, TransformComponent)!;
			const vel = world.getComponent(entity, VelocityComponent)!;
			const isPlayer = world.hasComponent(entity, PlayerComponent);

			// Apply velocity
			tra.position = add(tra.position, scale(vel.velocity, dt));

			// Add every planet's gravity to velocity
			for (const planet of planets) {
				if (planet.entity === entity) continue;
				if (isPlayer) {
					const distance = magnitude(subtract(planet.position, tra.position)) - planet.radius;
					const drag = 1.0 - max(0.0, min(1.0, distance / 1000.0));
					const gravity = calculateGravity(tra.position, planet.position, planet.force * dt);
					vel.velocity = add(vel.velocity, gravity);


					// Test for collisions
					/*
					for (const { entity: ent, position: planetPos, velocity: planetVelocity, force, radius } of planets) {
						if (ent === entity) continue;
						const friction = 2.0;
						if (hasCollided(tra.position, planetPos, radius)) {
							const normal = normalize(subtract(tra.position, planetPos));
							tra.position = add(planetPos, scale(normal, radius));
							const relativeVel = subtract(vel.velocity, planetVelocity);
							const dp = dot(relativeVel, normal);
							vel.velocity = add(vel.velocity, scale(normal, -dp));
							const speedDiff = magnitude(subtract(vel.velocity, planetVelocity));
							if (Math.abs(speedDiff) < 1) {
								vel.velocity = [...planetVelocity];
							} else {
								vel.velocity = lerp(vel.velocity, planetVelocity, friction * dt);
							}
						}
					}
					*/
				}

			}
		}

		// Pull everything towards the gravity wells

		// Update gravity wells first to avoid jitter
		const gravities = Array.from(entities).filter(e => world.hasComponent(e, GravityComponent));

		for (const entity of gravities) {
			updateEntity(entity);
		}

		refreshPlanets();
		const things = Array.from(entities).filter(e => !world.hasComponent(e, GravityComponent));
		for (const entity of things) {
			updateEntity(entity);
		}
	}
}


function calculateGravity(p: Point3, well: Point3, force: number): Vector3 {
	const diff = subtract(well, p);
	const distance = magnitude(diff);
	const dir = normalize(diff);

	return scale(dir, (1 / (distance ** 2)) * force * 1000);
}
function hasCollided(p0: Point3, p1: Point3, radius: number): boolean {
	return magnitude(subtract(p0, p1)) < radius;
}
