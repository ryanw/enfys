import { Matrix4 } from './math';
import { Material, SimpleMaterial } from './material';
import { Gfx } from 'engine';
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

	destroy() {
		if (isEntityOf(this, SimpleMesh)) {
			this.object.vertexBuffer.destroy();
			this.object.instanceBuffer.destroy();
		}
	}
}
