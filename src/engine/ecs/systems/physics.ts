import { add, scale } from "engine/math/vectors";
import { System } from ".";
import { World } from "../world";
import { TransformComponent, VelocityComponent } from "../components";
import { TerrainCache } from "../../../landscape/terrain_cache";
import { Gfx } from "engine";
import { TerrainComponent } from "../../../landscape/components/terrain";
import { PhysicsComponent } from "../components/physics";
import { Entity } from "..";
import { multiply } from "engine/math/transform";

type Seed = number;
const GRAVITY = -10.0;

export class PhysicsSystem extends System {
	terrainCache: Map<Seed, TerrainCache> = new Map();

	constructor(private gfx: Gfx) {
		super();
	}

	override async tick(dt: number, world: World) {
		await this.updatePhysics(dt, world);
	}

	updateDampening(dt: number, world: World, entity: Entity) {
		const phy = world.getComponent(entity, PhysicsComponent);
		if (!phy) return;

		const tra = world.getComponent(entity, TransformComponent)!;
		const vel = world.getComponent(entity, VelocityComponent)!;
		let damp = 0.5 * dt * phy.frictionMultiplier;
		if (phy.grounded) {
			damp *= 6;
		}
		if (damp > 0) {
			damp = 1 - damp;
			vel.velocity = [vel.velocity[0] * damp, vel.velocity[1], vel.velocity[2] * damp];
		}
	}

	async updatePhysics(dt: number, world: World) {
		const entities = world.entitiesWithComponents([VelocityComponent, TransformComponent]);

		for (const entity of entities) {
			// Update entity position
			const tra = world.getComponent(entity, TransformComponent)!;
			const vel = world.getComponent(entity, VelocityComponent)!;
			const phy = world.getComponent(entity, PhysicsComponent);
			tra.position = add(tra.position, scale(vel.velocity, dt));
			vel.velocity[1] += GRAVITY * dt;

			// Handle terrain collision
			const terrains = world.entitiesWithComponent(TerrainComponent);
			for (const terrainEnt of terrains) {
				const { terrainSeed } = world.getComponent(terrainEnt, TerrainComponent)!;
				const terrain = this.getTerrainCache(terrainSeed);
				const surfaceHeight = await terrain.heightAt(tra.position);
				if (phy) {
					phy.grounded = tra.position[1] <= surfaceHeight;
				}

				if (tra.position[1] <= surfaceHeight) {
					tra.position[1] = surfaceHeight;
					// Stop if falling
					if (vel.velocity[1] < 0.0) {
						vel.velocity[1] = 0.0;
					}
				}
			}
			this.updateDampening(dt, world, entity);
		}
	}

	getTerrainCache(seed: Seed): TerrainCache {
		if (!this.terrainCache.has(seed)) {
			this.terrainCache.set(seed, new TerrainCache(this.gfx, seed));
		}
		return this.terrainCache.get(seed)!;
	}
}
