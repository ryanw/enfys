import { Gfx, Size } from "engine";
import { Chunk, ChunkKey, toChunkHash } from "../landscape/chunker";
import { TerrainComponent } from "../landscape/components/terrain";
import { TerrainMesh } from "../landscape/terrain_mesh";
import { Camera } from "./camera";
import { Entity } from "./ecs";
import { TransformComponent } from "./ecs/components";
import { CameraComponent } from "./ecs/components/camera";
import { MeshComponent } from "./ecs/components/mesh";
import { World } from "./ecs/world";
import { Point3 } from "./math";
import { multiply, rotation, translation } from "./math/transform";
import { SimpleMesh } from "./mesh";
import { Pawn } from "./pawn";
import { ResourceId } from "./resource";
import { Scene } from "./scene";
import { TerrainPipeline } from "../landscape/pipelines/terrain";
import { ColorScheme } from "../landscape/color_scheme";

export type Resource = {};

let NEXT_RESOURCE_ID: number = 1000000;

export type QueuedChunk = {
	entity: Entity,
	seed: number,
	size: Size,
	chunk: Chunk;
};

export class WorldGraphics {
	camera?: Camera;
	private meshes: Map<Entity, Pawn<SimpleMesh>> = new Map();
	private terrains: Map<Entity, Map<ChunkKey, Pawn<SimpleMesh>>> = new Map();
	private cameras: Map<Entity, Camera> = new Map();
	private resources: Map<ResourceId, Resource> = new Map();
	private queuedTerrain: Map<ChunkKey, QueuedChunk> = new Map();
	private activeTerrain: Map<ChunkKey, Chunk> = new Map();
	private terrainPipeline: TerrainPipeline;

	constructor(private gfx: Gfx) {
		// FIXME make colour scheme dynamic
		const colorScheme = new ColorScheme(123);
		this.terrainPipeline = new TerrainPipeline(this.gfx, colorScheme);
	}

	update(world: World, scene: Scene) {
		this.updateCameras(world, scene);
		this.updateMeshes(world, scene);
		this.updateTerrain(world, scene);
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
			const { position, rotation: rot } = world.getComponent(entity, TransformComponent)!;
			const transform = multiply(
				translation(...position),
				rotation(rot[0], rot[1], 0),
			);

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

	updateTerrain(world: World, scene: Scene) {
		const entities = world.entitiesWithComponent(TerrainComponent);
		const saw = new Set();
		for (const entity of entities) {
			saw.add(entity);

			const terrain = world.getComponent(entity, TerrainComponent)!;
			this.updateTerrainQueue(entity, terrain);
			if (this.queuedTerrain.size === 0) {
				this.removeExpiredTerrainChunks(entity, terrain, scene);
			}
		}
		this.processTerrainQueue(scene);

		const removed: Array<Entity> = [...this.meshes.keys()].filter(e => !saw.has(e));
		for (const entity of removed) {
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

	private updateTerrainQueue(entity: Entity, terrain: TerrainComponent) {
		for (const [key, chunk] of terrain.chunks.entries()) {
			if (this.activeTerrain.has(key) || this.queuedTerrain.has(key)) continue;
			this.queuedTerrain.set(key, { entity, seed: terrain.seed, size: terrain.chunkSize, chunk });
		}
	}

	private processTerrainQueue(scene: Scene, batchSize: number = 8) {
		if (this.queuedTerrain.size === 0) return;
		const chunkies = this.queuedTerrain.keys();
		let i = 0;
		for (const key of chunkies) {
			const chunk = this.queuedTerrain.get(key);
			if (!chunk) continue;
			this.generateTerrainChunk(scene, chunk);
			this.queuedTerrain.delete(key);
			if (++i >= batchSize) break;
		}
	}

	private generateTerrainChunk(scene: Scene, queuedChunk: QueuedChunk) {
		const { entity, size: chunkSize, seed, chunk } = queuedChunk;
		const scale = 1 << chunk.lod;
		const chunkId: Point3 = [
			chunk.position[0] / scale | 0,
			chunk.position[1] / scale | 0,
			chunk.lod,
		];
		const position: Point3 = [
			chunkId[0] * scale * chunkSize[0],
			0,
			chunkId[1] * scale * chunkSize[1],
		];
		const key = toChunkHash(chunk);
		this.activeTerrain.set(key, chunk);
		const terrain = scene.addMesh(
			new TerrainMesh(
				scene.gfx,
				chunkSize,
				chunkId,
				seed,
				this.terrainPipeline,
			),
			translation(...position),
		);
		if (!this.terrains.has(entity)) {
			this.terrains.set(entity, new Map());
		}
		const chunks = this.terrains.get(entity)!;
		chunks.set(toChunkHash(chunk), terrain);
	}

	private removeExpiredTerrainChunks(entity: Entity, terrain: TerrainComponent, scene: Scene) {
		const chunks = this.terrains.get(entity);
		if (!chunks) return;
		for (const [key, _chunk] of this.activeTerrain.entries()) {
			// It's still live, skip it
			if (terrain.chunks.has(key)) continue;
			this.activeTerrain.delete(key);

			const pawn = chunks.get(key);
			if (!pawn) continue;
			// Terrain has expired, remove it
			scene.removePawn(pawn);
			chunks.delete(key);
		}
	}
}

export class MissingResource extends Error {
	constructor(id: ResourceId) {
		super(`Resource Not Found: ${id}`);
	}
}
