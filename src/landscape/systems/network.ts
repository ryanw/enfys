import { System } from 'engine/ecs/systems';
import { World } from 'engine/ecs/world';
import { JoinMessage, LeaveMessage, MoveMessage, ServerMessages, Socket } from 'engine/net/socket';
import { opponentPrefab} from '../prefabs';
import { PlayerComponent, TransformComponent, VelocityComponent } from 'engine/ecs/components';
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
	private pendingMoves: Array<MoveMessage> = [];
	private lastSend: number = 0;
	private previousState: PlayerState = { position: [0, 0, 0], velocity: [0, 0, 0], rotation: [0, 0, 0] };
	private players: Record<number, Entity> = {};

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
			case 'move':
				this.pendingMoves.push(message);
				return;
			default:
				console.warn("Unhandled message", message);
		}
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
	}
}
