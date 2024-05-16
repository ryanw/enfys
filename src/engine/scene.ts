import { Matrix4 } from './math';
import { Material } from './material';
import { Color, Gfx } from 'engine';
import { SimpleMesh } from './mesh';
import { UniformBuffer } from './uniform_buffer';
import { identity } from './math/transform';

export class Entity<T = any> {
	private buffer: UniformBuffer;
	private _transform: Matrix4 = identity();

	constructor(
		gfx: Gfx,
		readonly object: T,
		public material: Material,
		transform: Matrix4 = identity(),
	) {
		this.buffer = new UniformBuffer(gfx, [['transform', 'mat4x4f']]);
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

/**
 * Contains all GPU resources that can be rendered in a scene
 */
export class Scene {
	clearColor: Color = [0, 0, 0, 0];
	meshes: Entity<SimpleMesh>[] = [];

	constructor(readonly gfx: Gfx) { }

	add(item: Entity<SimpleMesh>) {
		this.meshes.push(item);
	}
}
