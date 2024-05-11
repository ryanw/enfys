import { Color, GBuffer } from "engine";
import { Mesh, PointVertex } from "./mesh";

export type SimpleMesh = Mesh<PointVertex>;

export interface Drawable {
	draw(encoder: GPUCommandEncoder, scene: Scene, target: GBuffer): void;
}

/**
 * Contains all GPU resources that can be rendered in a scene
 */
export default class Scene {
	clearColor: Color = [100, 10, 200, 255];
	drawables: Array<Drawable> = [];
	meshes: Array<SimpleMesh> = [];

	add(drawable: Drawable) {
		this.drawables.push(drawable);
	}

	addMesh(drawable: SimpleMesh) {
		this.meshes.push(drawable);
	}
}
