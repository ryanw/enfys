import { Matrix4 } from './math';
import { Material } from './material';
import { Color, Gfx } from 'engine';
import { SimpleMesh } from './mesh';
import { UniformBuffer } from './uniform_buffer';
import { identity } from './math/transform';

/**
 * Type Guard to test if the `T` in {@link Entity} is a specific type
 *
 * @param entity Entity to test
 * @param constructor Constructor of the type to verify
 *
 * @example
 * if (isEntityOf(entity, SimpleMesh)) {
 *   console.log(
 *     "Entity is a mesh with %i vertices",
 *     entity.object.vertexCount,
 *   );
 * }
 */
export function isEntityOf<T>(entity: Entity<unknown>, constructor: new (...args: any[]) => T): entity is Entity<T> {
	return entity.object instanceof constructor;
}

export class Entity<T> {
	private buffer: UniformBuffer;
	private _transform: Matrix4 = identity();

	constructor(
		gfx: Gfx,
		readonly object: T,
		public material: Material,
		transform: Matrix4 = identity(),
	) {
		this.buffer = new UniformBuffer(gfx, [
			['transform', 'mat4x4f'],
			['id', 'u32'],
		]);
		this.buffer.set('id', Math.random() * 0xffffffff | 0);
		this.transform = transform;
	}

	get transform(): Matrix4 {
		return [...this._transform];
	}

	set transform(transform: Matrix4) {
		this._transform = [...transform];
		this.buffer.set('transform', transform);
	}

	bindingResource(): GPUBindingResource {
		return this.buffer.bindingResource();
	}
}

export type AddArguments = Parameters<Scene['addEntity']> | Parameters<Scene['addMesh']>;

/**
 * Contains all GPU resources that can be rendered in a scene
 */
export class Scene {
	clearColor: Color = [0, 0, 0, 0];
	entities: Entity<unknown>[] = [];

	constructor(readonly gfx: Gfx) { }

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

	addMesh<T extends SimpleMesh | SimpleMesh>(item: T, transform?: Matrix4): Entity<T> {
		return this.addEntity(new Entity(
			this.gfx,
			item,
			new Material(this.gfx, [255, 255, 255, 255]),
			transform
		));
	}

	removeEntity(entity: Entity<unknown>) {
		this.entities = this.entities.filter(e => e !== entity);
		if (isEntityOf(entity, SimpleMesh)) {
			entity.object.vertexBuffer.destroy();
			entity.object.instanceBuffer.destroy();
		}
	}
}
