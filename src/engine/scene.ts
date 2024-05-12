import { Color, GBuffer, Gfx } from "engine";
import { Mesh } from "./mesh";
import { Matrix4, Point2, Point3, Vector3, } from "./math";
import { Material } from "./material";

export type TexVertex = { position: Point3, normal: Vector3, uv: Point2 }

export class SimpleMesh extends Mesh<TexVertex> {
	attributeOrder: Array<keyof TexVertex> = ["position", "normal", "uv"];
	constructor(gfx: Gfx, vertices: Array<TexVertex>) {
		super(gfx);
		this.uploadVertices(vertices);
	}
}

export interface Drawable<T> {
	object: T;
	transform: Matrix4;
	material: Material;
}

/**
 * Contains all GPU resources that can be rendered in a scene
 */
export default class Scene {
	clearColor: Color = [0, 0, 0, 0];
	meshes: Drawable<SimpleMesh>[] = [];

	addMesh(drawable: Drawable<SimpleMesh>) {
		this.meshes.push(drawable);
	}
}
