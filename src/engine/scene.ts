import { Matrix4 } from './math';
import { Material } from './material';
import { Color } from 'engine';
import { SimpleMesh } from './mesh';

export interface Drawable<T> {
	object: T;
	transform: Matrix4;
	material: Material;
}



/**
 * Contains all GPU resources that can be rendered in a scene
 */
export class Scene {
	clearColor: Color = [0, 0, 0, 0];
	meshes: Drawable<SimpleMesh>[] = [];

	addMesh(drawable: Drawable<SimpleMesh>) {
		this.meshes.push(drawable);
	}
}
