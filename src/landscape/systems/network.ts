import { System } from 'engine/ecs/systems';
import { World } from 'engine/ecs/world';
import { JoinMessage, LeaveMessage, TransformMessage, ServerMessages, Socket, SpawnMessage, DespawnMessage } from 'engine/net/socket';
import prefabs, { opponentPrefab } from '../prefabs';
import { NetworkComponent, PlayerComponent, TransformComponent, VelocityComponent } from 'engine/ecs/components';
import { Point3, Vector3 } from 'engine/math';
import { magnitude, subtract } from 'engine/math/vectors';
import { Entity } from 'engine/ecs';

const NETWORK_LIVE_FPS = 30;
const NETWORK_IDLE_FPS = 1;

export interface PlayerState {
	position: Point3;
	velocity: Vector3;
	rotation: Vector3;
}

export class NetworkSystem extends System {
	private pendingJoins: Array<JoinMessage> = [];
	private pendingLeaves: Array<LeaveMessage> = [];
	private pendingMoves: Array<TransformMessage> = [];
	private pendingSpawns: Array<SpawnMessage> = [];
	private pendingDespawns: Array<DespawnMessage> = [];
	private activeEntities: Set<Entity> = new Set();
	private lastSend: number = 0;
	private previousState: PlayerState = { position: [0, 0, 0], velocity: [0, 0, 0], rotation: [0, 0, 0] };
	private players: Record<number, Entity> = {};
	private serverEntities: Record<number, Entity> = {};

	constructor(public socket: Socket) {
		super();
		socket.on(this.onMessage.bind(this));
	}

	onMessage(message: ServerMessages) {
		switch (message.action) {
			case 'join':
				this.pendingJoins.push(message);
				return;
			case 'leave':
				this.pendingLeaves.push(message);
				return;
			case 'transform':
				this.pendingMoves.push(message);
				return;
			case 'spawn':
				this.pendingSpawns.push(message);
				return;
			case 'despawn':
				this.pendingDespawns.push(message);
				return;
			default:
				console.warn("Unhandled message", message);
		}
	}

	async updateNetworkComponents(world: World) {
		const entities = world.entitiesWithComponents([NetworkComponent, TransformComponent]);
		for (const entity of entities) {
			const transform = world.getComponent(entity, TransformComponent)!;
			const velocity = world.getComponent(entity, VelocityComponent)?.velocity ?? [0, 0, 0];
			if (!this.activeEntities.has(entity)) {
				// New entity
				this.activeEntities.add(entity);
				const prefab = world.getComponent(entity, NetworkComponent)!.prefab;
				this.socket.spawnEntity(entity, prefab, transform.position, transform.rotation, velocity);
			}
			else {
				// Updated entity
			}
		}
		// Removed entities
		for (const entity of this.activeEntities) {
			if (entities.has(entity)) continue;
			this.socket.despawnEntity(entity);
			this.activeEntities.delete(entity);
		}
	}

	async updateSpawns(world: World) {
		for (const spawn of this.pendingSpawns) {
			const prefabName = spawn.prefab as keyof typeof prefabs;
			const entity = prefabs[prefabName]?.(world, false, spawn.position, spawn.rotation, spawn.velocity);
			this.serverEntities[spawn.id] = entity;
		}
		this.pendingSpawns = [];

		for (const despawn of this.pendingDespawns) {
			const entity = this.serverEntities[despawn.id];
			if (entity) {
				delete this.serverEntities[despawn.id];
				world.removeEntity(entity);
			}
		}
		this.pendingDespawns = [];
	}

	async tick(_dt: number, world: World) {
		for (const join of this.pendingJoins) {
			const player = opponentPrefab(world, [3, 3, 0]);
			this.players[join.id] = player;
		}
		this.pendingJoins = [];

		for (const leave of this.pendingLeaves) {
			const entity = this.players[leave.id];
			world.removeEntity(entity);
			delete this.players[leave.id];
		}
		this.pendingLeaves = [];

		for (const move of this.pendingMoves) {
			const playerEntity = this.players[move.id];
			if (!playerEntity) {
				console.error("Unknown player", move);
				continue;
			}
			const transform = world.getComponent(playerEntity, TransformComponent)!;
			const velocity = world.getComponent(playerEntity, VelocityComponent)!;
			transform.position = [...move.position];
			transform.rotation = [...move.rotation];
			//velocity.velocity = move.velocity;
		}
		this.pendingMoves = [];

		if (!this.socket.isConnected) {
			return;
		}
		const now = performance.now();
		const playerCount = Object.keys(this.players).length;
		const delay = 1000 / (playerCount === 0 ? NETWORK_IDLE_FPS : NETWORK_LIVE_FPS);
		if (this.lastSend === 0 || (now - this.lastSend) > delay) {
			this.lastSend = now;
			// Tell server where player is
			const entities = world.entitiesWithComponents([PlayerComponent, VelocityComponent, TransformComponent]);
			for (const entity of entities) {
				const { position, rotation } = world.getComponent(entity, TransformComponent)!;
				const { velocity } = world.getComponent(entity, VelocityComponent)!;
				const state: PlayerState = { position, velocity, rotation };
				const d0 = magnitude(subtract(this.previousState.position, state.position));
				const d2 = magnitude(subtract(this.previousState.rotation, state.rotation));
				const threshold = 0.001;
				if (d0 + d2 > threshold) {
					this.previousState = state;
					this.socket.move(state.position, state.velocity, state.rotation);
				}
			}
		}

		await this.updateNetworkComponents(world);
		await this.updateSpawns(world);
	}
}
