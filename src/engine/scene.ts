import { Matrix4, Point3 } from './math';
import { SimpleMaterial } from './material';
import { Color, Gfx } from 'engine';
import { SimpleMesh } from './mesh';
import { ShadowBuffer } from './shadow_buffer';
import { Entity } from './entity';

export type AddArguments = Parameters<Scene['addEntity']> | Parameters<Scene['addMesh']>;

/**
 * Contains the graph of all GPU objects draw in a scene
 */
export class Scene {
	clearColor: Color = [0, 0, 0, 0];
	entities: Entity<unknown>[] = [];
	shadowBuffer: ShadowBuffer;
	lightPosition: Point3 = [0, 0, 0];

	constructor(readonly gfx: Gfx) {
		this.shadowBuffer = new ShadowBuffer(gfx, 32);
		this.shadowBuffer.push({
			position: [0.0, 1000.0, 0.0],
			radius: 0.2,
			umbra: 0.33,
			shape: 0,
			color: 0xff00ffff,
		});
	}

	add(...args: AddArguments): Entity<unknown> | void {
		// FIXME this is a big hacky
		if (args[0] instanceof Entity) {
			return this.addEntity(...(args as Parameters<Scene['addEntity']>));
		}
		else if (args[0] instanceof SimpleMesh) {
			return this.addMesh(...args as Parameters<Scene['addMesh']>);
		}
	}

	addEntity<T>(entity: Entity<T>): Entity<T> {
		this.entities.push(entity);
		return entity;
	}

	addMesh<T extends SimpleMesh>(item: T, transform?: Matrix4): Entity<T> {
		return this.addEntity(new Entity(
			this.gfx,
			item,
			new SimpleMaterial(this.gfx, 0xffffffff),
			transform
		));
	}

	removeEntity(entity: Entity<unknown>) {
		this.entities = this.entities.filter(e => e !== entity);
		entity.destroy();
	}
}
