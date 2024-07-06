import { Camera } from "./camera";
import { Entity } from "./ecs";
import { TransformComponent } from "./ecs/components";
import { CameraComponent } from "./ecs/components/camera";
import { MeshComponent } from "./ecs/components/mesh";
import { World } from "./ecs/world";
import { translation } from "./math/transform";
import { SimpleMesh } from "./mesh";
import { Pawn } from "./pawn";
import { ResourceId } from "./resource";
import { Scene } from "./scene";

export type Resource = {};

let NEXT_RESOURCE_ID: number = 1000000;

export class WorldGraphics {
	private meshes: Map<Entity, Pawn<SimpleMesh>> = new Map();
	private cameras: Map<Entity, Camera> = new Map();
	private resources: Map<ResourceId, Resource> = new Map();
	camera?: Camera;

	update(world: World, scene: Scene) {
		this.updateCameras(world, scene);
		this.updateMeshes(world, scene);
	}

	updateCameras(world: World, scene: Scene) {
		const entities = world.entitiesWithComponents([CameraComponent, TransformComponent]);
		const saw = new Set();
		for (const entity of entities) {
			saw.add(entity);
			let camera = this.cameras.get(entity);
			if (!camera) {
				camera = new Camera(scene.gfx);
				this.cameras.set(entity, camera);
				scene.addCamera(camera);
			}
			const { position, rotation } = world.getComponent(entity, TransformComponent)!;
			camera.position = [...position];
			camera.rotation = [...rotation];
		}

		const removed: Array<Entity> = [...this.cameras.keys()].filter(e => !saw.has(e));
		for (const entity of removed) {
			console.warn("Camera Removed", entity);
		}
	}

	updateMeshes(world: World, scene: Scene) {
		const entities = world.entitiesWithComponents([MeshComponent, TransformComponent]);
		const saw = new Set();
		for (const entity of entities) {
			saw.add(entity);

			const { meshId: meshResourceId } = world.getComponent(entity, MeshComponent)!;
			const { position } = world.getComponent(entity, TransformComponent)!;
			const transform = translation(...position);

			let pawn = this.meshes.get(entity);
			if (!pawn) {
				// Create
				const mesh: SimpleMesh = this.getResource(meshResourceId);
				console.debug("Adding mesh for entity", entity, mesh);
				pawn = scene.addMesh(mesh, transform);
				this.meshes.set(entity, pawn);
			}
			// Update
			pawn.transform = transform;
		}
		const removed: Array<Entity> = [...this.meshes.keys()].filter(e => !saw.has(e));
		for (const entity of removed) {
			const pawn = this.meshes.get(entity);
			this.meshes.delete(entity);
			if (pawn) {
				// Delete
				scene.removePawn(pawn);
			}
		}
	}

	nextResourceId() {
		return NEXT_RESOURCE_ID++;
	}

	addResource<T extends Resource>(resource: T): ResourceId {
		const id = this.nextResourceId();
		this.resources.set(id, resource);
		return id;
	}

	insertResource<T extends Resource>(id: ResourceId, resource: T) {
		this.resources.set(id, resource);
	}

	private getResource<T extends Resource>(id: ResourceId): T {
		const res = this.resources.get(id);
		if (!res) {
			throw new MissingResource(id);
		}
		return res as T;
	}
}

export class MissingResource extends Error {
	constructor(id: ResourceId) {
		super(`Resource Not Found: ${id}`);
	}
}
