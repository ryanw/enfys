import { Gfx } from 'engine';
import { System } from 'engine/ecs/systems';
import { World } from 'engine/ecs/world';
import { TerrainComponent } from '../components/terrain';
import { Entity } from 'engine/ecs';
import { TransformComponent } from 'engine/ecs/components';
import { generateChunks, toChunkHash } from 'engine/terrain';
import { Point3 } from 'engine/math';

export class TerrainSystem extends System {
	constructor(
		readonly gfx: Gfx,
		public minLod: number = 0,
		public maxLod: number = 4,
		public range: number = 2,
	) {
		super();
	}

	override async tick(dt: number, world: World) {
		const entities = world.entitiesWithComponents([TerrainComponent]);
		for (const entity of entities) {
			const { target } = world.getComponent(entity, TerrainComponent)!;
			let position = [0,0,0] as Point3;
			if (target) {
				position = world.getComponent(target, TransformComponent)!.position;
			}
			this.move(world, entity, position[0], position[2]);
		}
	}

	move(world: World, entity: Entity, x: number, y: number) {
		const terrain = world.getComponent(entity, TerrainComponent)!;

		const cx = x / terrain.chunkSize[0] | 0;
		const cy = y / terrain.chunkSize[1] | 0;
		if (cx === terrain.currentChunk[0] && cy === terrain.currentChunk[1]) {
			return;
		}
		terrain.currentChunk = [cx, cy];

		terrain.chunks.clear();
		const chunks = generateChunks(cx, cy, this.minLod, this.maxLod, this.range);
		for (const chunk of chunks) {
			terrain.chunks.set(toChunkHash(chunk), chunk);
		}
	}
}
