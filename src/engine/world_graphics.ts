import { Gfx, Size } from 'engine';
import { Camera } from './camera';
import { Entity } from './ecs';
import { TransformComponent } from './ecs/components';
import { CameraComponent } from './ecs/components/camera';
import { MeshComponent } from './ecs/components/mesh';
import { World } from './ecs/world';
import { Point3, Vector3 } from './math';
import { multiply, multiplyVector, rotation, translation } from './math/transform';
import { SimpleMesh } from './mesh';
import { Pawn } from './pawn';
import { ResourceId } from './resource';
import { Scene } from './scene';
import { SimpleMaterial } from './material';
import { LightComponent } from './ecs/components/light';
import { DirectionalLight } from './light';
import { Chunk, ChunkKey, toChunkHash } from './terrain';
import { ParticlesComponent } from './ecs/components/particles';
import { Particles } from './particles';
import { TerrainComponent } from './ecs/components/terrain';
import { TerrainMesh } from './terrain_mesh';
import { TerrainPipeline } from './pipelines/terrain';
import { ColorScheme } from './color_scheme';
import { DecorComponent } from './ecs/components/decor';
import { DecorMesh } from './decor_mesh';

export type Resource = {};

let NEXT_RESOURCE_ID: number = 1000000;

export type QueuedChunk = {
	entity: Entity,
	terrainSeed: number,
	colorSeed: number,
	size: Size,
	chunk: Chunk;
};

export class WorldGraphics {
	private meshes: Map<Entity, Pawn<SimpleMesh>> = new Map();
	private decors: Map<Entity, Pawn<DecorMesh>> = new Map();
	private lights: Map<Entity, DirectionalLight> = new Map();
	private particles: Map<Entity, Pawn<Particles>> = new Map();
	private terrains: Map<Entity, Map<ChunkKey, Pawn<SimpleMesh>>> = new Map();
	private cameras: Map<Entity, Camera> = new Map();
	private resources: Map<ResourceId, Resource> = new Map();
	private queuedTerrain: Map<ChunkKey, QueuedChunk> = new Map();
	private activeTerrain: Map<ChunkKey, Chunk> = new Map();
	private terrainPipelines: Map<number, TerrainPipeline> = new Map();

	constructor(private gfx: Gfx) {
	}

	update(world: World, scene: Scene) {
		this.updateCameras(world, scene);
		this.updateLights(world, scene);
		this.updateMeshes(world, scene);
		this.updateTerrain(world, scene);
		this.updateDecor(world, scene);
		this.updateParticles(world, scene);
		this.updateClipping(scene);
	}

	updateClipping(scene: Scene) {
		const camera = scene.primaryCamera;
		const planes = camera.clippingPlanes();
		scene.frustumClip(planes);
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
			console.warn('Camera Removed', entity);
		}
	}

	updateLights(world: World, scene: Scene) {
		const entities = world.entitiesWithComponents([LightComponent, TransformComponent]);
		const saw = new Set();
		for (const entity of entities) {
			saw.add(entity);

			const { position: lightPosition, rotation: lightRotation } = world.getComponent(entity, TransformComponent)!;

			let light = this.lights.get(entity);
			if (!light) {
				scene.light = new DirectionalLight(this.gfx);
				light = scene.light;
				this.lights.set(entity, light);
			}
			light.position = lightPosition;
			light.rotation = lightRotation;
			const camera = scene.primaryCamera;
			light.updateForCamera(camera);
		}

		const removed: Array<Entity> = [...this.lights.keys()].filter(e => !saw.has(e));
		for (const entity of removed) {
			console.warn('Not implemented: Remove light', entity);
		}
	}

	updateParticles(world: World, scene: Scene) {
		const entities = world.entitiesWithComponents([ParticlesComponent, TransformComponent]);
		const saw = new Set();
		for (const entity of entities) {
			saw.add(entity);
			const { meshId, count: particleCount, emissive } = world.getComponent(entity, ParticlesComponent)!;
			const { position: emitterPosition, rotation: emitterRotation } = world.getComponent(entity, TransformComponent)!;

			let particles = this.particles.get(entity);
			if (!particles) {
				const mesh: SimpleMesh = this.getResource(meshId);
				particles = scene.addMesh(new Particles(this.gfx, [], 256));
				if (particles.material instanceof SimpleMaterial) {
					particles.material.emissive = emissive;
				}
				this.particles.set(entity, particles);
				particles.object.vertexBuffer = mesh.vertexBuffer;
				particles.object.vertexCount = mesh.vertexCount;
				particles.object.variantCount = mesh.variantCount;
			}
			particles.object.origin = emitterPosition;
			particles.object.direction = multiplyVector(rotation(...emitterRotation), [0, -1, 0, 0]).slice(0, 3) as Vector3;
			particles.object.update(performance.now() / 1000.0);
			particles.object.count = particleCount;
		}

		const removed: Array<Entity> = [...this.particles.keys()].filter(e => !saw.has(e));
		for (const entity of removed) {
			console.warn('Not implemented: Remove particles', entity);
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
				console.debug('Adding mesh for entity', entity, mesh);
				pawn = scene.addMesh(mesh, new SimpleMaterial(this.gfx, 0xffffffff), transform);
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

		const removed: Array<Entity> = [...this.terrains.keys()].filter(e => !saw.has(e));
		for (const entity of removed) {
		}
	}

	updateDecor(world: World, scene: Scene) {
		const entities = world.entitiesWithComponent(DecorComponent);
		const terrainId = [...world.entitiesWithComponent(TerrainComponent)][0];
		if (!terrainId) return;
		const { terrainSeed } = world.getComponent(terrainId, TerrainComponent)!;
		const saw = new Set();
		for (const entity of entities) {
			saw.add(entity);
			const { seed: decorSeed, spread, radius, meshId } = world.getComponent(entity, DecorComponent)!;
			let decor = this.decors.get(entity);
			if (!decor) {
				console.debug('Adding Decor for entity', entity, meshId);
				const mesh: SimpleMesh = this.getResource(meshId);
				decor = scene.addMesh(new DecorMesh(this.gfx, [], [0, 0], 1.0, spread, terrainSeed, decorSeed, radius));
				decor.object.vertexBuffer = mesh.vertexBuffer;
				decor.object.vertexCount = mesh.vertexCount;
				decor.object.variantCount = mesh.variantCount;
				if (decor.material instanceof SimpleMaterial) {
					decor.material.fadeout = 8 * radius * spread;
				}
				this.decors.set(entity, decor);
			}
			decor.object.clippingPlanes = scene.primaryCamera.clippingPlanes();
			const pos = scene.primaryCamera.position;
			decor.object.move(pos[0], pos[2]);
		}
		this.processTerrainQueue(scene);

		const removed: Array<Entity> = [...this.decors.keys()].filter(e => !saw.has(e));
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
			this.queuedTerrain.set(key, {
				entity,
				terrainSeed: terrain.terrainSeed,
				colorSeed: terrain.colorSeed,
				size: terrain.chunkSize,
				chunk,
			});
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
		const { entity, size: chunkSize, terrainSeed, colorSeed, chunk } = queuedChunk;
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
				terrainSeed,
				colorSeed,
				this.getTerrainPipeline(terrainSeed),
			),
			new SimpleMaterial(this.gfx, 0xffffffff),
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

	private getTerrainPipeline(seed: number): TerrainPipeline {
		let pipeline = this.terrainPipelines.get(seed);
		if (!pipeline) {
			pipeline = new TerrainPipeline(this.gfx, new ColorScheme(seed));
			this.terrainPipelines.set(seed, pipeline);
		}
		return pipeline;
	}
}

export class MissingResource extends Error {
	constructor(id: ResourceId) {
		super(`Resource Not Found: ${id}`);
	}
}
