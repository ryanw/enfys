import { add, scale } from "engine/math/vectors";
import { System } from ".";
import { World } from "../world";
import { TransformComponent, VelocityComponent } from "../components";
import { TerrainCache } from "../../../landscape/terrain_cache";
import { Gfx } from "engine";
import { TerrainComponent } from "../../../landscape/components/terrain";

type Seed = number;
const GRAVITY = -10.0;

export class PhysicsSystem extends System {
	terrainCache: Map<Seed, TerrainCache> = new Map();

	constructor(private gfx: Gfx) {
		super();
	}

	override async tick(dt: number, world: World) {
		await this.updateTerrainPhysics(dt, world);
	}

	async updateTerrainPhysics(dt: number, world: World) {
		const entities = world.entitiesWithComponents([VelocityComponent, TransformComponent]);

		for (const entity of entities) {
			// Update entity position
			const tra = world.getComponent(entity, TransformComponent)!;
			const vel = world.getComponent(entity, VelocityComponent)!;
			tra.position = add(tra.position, scale(vel.velocity, dt));
			vel.velocity[1] += GRAVITY * dt;

			// Handle terrain collision
			const terrains = world.entitiesWithComponent(TerrainComponent);
			for (const terrainEnt of terrains) {
				const { seed } = world.getComponent(terrainEnt, TerrainComponent)!;
				const terrain = this.getTerrainCache(seed);
				const surfaceHeight = await terrain.heightAt(tra.position);

				if (tra.position[1] < surfaceHeight) {
					tra.position[1] = surfaceHeight;
					vel.velocity[1] = 0.0;
				}
			}
		}
	}

	getTerrainCache(seed: Seed): TerrainCache {
		if (!this.terrainCache.has(seed)) {
			this.terrainCache.set(seed, new TerrainCache(this.gfx, seed));
		}
		return this.terrainCache.get(seed)!;
	}
}
