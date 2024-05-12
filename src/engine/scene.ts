import { Color, GBuffer, Gfx } from "engine";
import { Mesh } from "./mesh";
import { Point2, Point3, Vector3, } from "./math";

export type TexVertex = { position: Point3, normal: Vector3, uv: Point2 }

export class SimpleMesh extends Mesh<TexVertex> {
	attributeOrder: Array<keyof TexVertex> = ["position", "normal", "uv"];
	constructor(gfx: Gfx, vertices: Array<TexVertex>) {
		super(gfx);
		this.uploadVertices(vertices);
	}
}

export interface Drawable {
	draw(encoder: GPUCommandEncoder, scene: Scene, target: GBuffer): void;
}

/**
 * Contains all GPU resources that can be rendered in a scene
 */
export default class Scene {
	clearColor: Color = [0, 0, 0, 0];
	drawables: Array<Drawable> = [];
	meshes: Array<SimpleMesh> = [];

	add(drawable: Drawable) {
		this.drawables.push(drawable);
	}

	addMesh(drawable: SimpleMesh) {
		this.meshes.push(drawable);
	}
}
