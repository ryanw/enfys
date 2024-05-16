import { Matrix4 } from './math';
import { Material } from './material';
import { Color, Gfx } from 'engine';
import { SimpleMesh } from './mesh';
import { UniformBuffer } from './uniform_buffer';

export interface Drawable<T> {
	object: T;
	material: Material;
	transform: Matrix4;
}


export interface SceneItem<T> {
	object: T;
	material: Material;
	transform: UniformBuffer;
}

/**
 * Contains all GPU resources that can be rendered in a scene
 */
export class Scene {
	clearColor: Color = [0, 0, 0, 0];
	meshes: SceneItem<SimpleMesh>[] = [];

	constructor(readonly gfx: Gfx) { }

	add(drawable: Drawable<SimpleMesh>) {
		const buffer = new UniformBuffer(this.gfx, [
			['transform', 'mat4x4f'],
		]);
		buffer.set('transform', drawable.transform);
		this.meshes.push({
			object: drawable.object,
			material: drawable.material,
			transform: buffer,
		});
	}
}
