import { Point3, Vector3, Vector4 } from "engine/math";

export enum ServerActions {
	Noop,
	Login,
	Logout,
	Join,
	Leave,
	Transform,
	Spawn,
	Despawn,
	Damage,
}

export interface LoginMessage {
	action: 'login';
	name: string;
	seed: number;
}

export interface LogoutMessage {
	action: 'logout';
}

export interface JoinMessage {
	action: 'join';
	id: number;
	name: string;
}

export interface LeaveMessage {
	action: 'leave';
	id: number;
}

export interface TransformMessage {
	action: 'transform';
	id: number;
	position: Point3;
	rotation: Vector3;
	velocity: Vector3;
}

export interface SpawnMessage {
	action: 'spawn';
	id: number;
	position: Point3;
	rotation: Vector3;
	velocity: Vector3;
	prefab: string;
}

export interface DespawnMessage {
	action: 'despawn';
	id: number;
}

export type ClientMessages = LoginMessage | LogoutMessage | TransformMessage | SpawnMessage | DespawnMessage;
export type ServerMessages = TransformMessage | JoinMessage | LeaveMessage | SpawnMessage | DespawnMessage;

export type MessageCallback = (arg: ServerMessages) => void;

export class Socket {
	private websocket!: WebSocket;
	private callbacks: Array<MessageCallback> = [];
	private queue: Array<ClientMessages> = [];

	constructor(protected url: string) {
		this.connect();
	}

	get isConnected(): boolean {
		return this.websocket.readyState === WebSocket.OPEN;
	}

	get isConnecting(): boolean {
		return this.websocket.readyState === WebSocket.CONNECTING;
	}

	get isClosing(): boolean {
		return this.websocket.readyState === WebSocket.CLOSING;
	}

	get isClosed(): boolean {
		return this.websocket.readyState === WebSocket.CLOSED;
	}

	connect() {
		console.info("Connecting to Socket", this.url);
		this.websocket = new WebSocket(this.url);
		this.websocket.addEventListener('open', this.onOpen);
		this.websocket.addEventListener('close', this.onClose);
		this.websocket.addEventListener('message', this.onMessage);
		this.websocket.addEventListener('error', this.onError);
	}

	send(message: ClientMessages) {
		switch (this.websocket.readyState) {
			case WebSocket.OPEN:
				this.websocket.send(encodeMessage(message));
				return;

			case WebSocket.CONNECTING:
				// Retry later
				this.queue.push(message);
				return;

			default:
				throw new Error(`Failed to send message, socket isn't connected: ${message}`);
		}
	}

	login(name: string, seed: number) {
		this.send({ action: 'login', name, seed });
	}

	logout() {
		this.send({ action: 'logout' });
	}

	move(position: Point3, rotation: Vector3, velocity: Vector3) {
		this.updateEntity(-1, position, velocity, rotation);
	}

	spawnEntity(entity: number, prefab: string, position: Point3, rotation: Vector3, velocity: Vector3) {
		this.send({ action: 'spawn', id: entity, position, velocity, rotation, prefab });
	}

	despawnEntity(entity: number) {
		this.send({ action: 'despawn', id: entity });
	}

	updateEntity(entity: number, position: Point3, rotation: Vector3, velocity: Vector3) {
		this.send({ action: 'transform', id: entity, position, velocity, rotation });
	}

	on(callback: MessageCallback) {
		this.callbacks.push(callback);
	}

	private onOpen = (e: Event) => {
		console.info("Socket connected", e);
		for (const msg of this.queue) {
			this.send(msg);
		}
		this.queue = [];
	}

	private onMessage = async (e: MessageEvent<Blob>) => {
		const buffer = await e.data.arrayBuffer();
		const msg = decodeMessage(buffer);
		if (msg) {
			for (const callback of this.callbacks) {
				callback(msg);
			}
		}
	}

	private onClose = (e: CloseEvent) => {
		console.info("Socket Closed", e);
	}

	private onError = (e: Event) => {
		console.error("Socket Error", e);
	}
}

function decodeMessage(bytes: ArrayBuffer): ServerMessages | void {
	const alignLength = Math.floor(bytes.byteLength / 4);
	const u32 = new Uint32Array(bytes, 0, alignLength);
	const id = u32[1];
	switch (u32[0]) {
		case ServerActions.Join: {
			const length = u32[2]; // FIXME this is actually u64
			const chars = new Uint8Array(bytes, 12, length);
			const name = String.fromCharCode(...chars);
			console.log("Player joined", id, name);
			return { action: 'join', id, name } as JoinMessage;
		}
		case ServerActions.Leave: {
			console.log("Player left", id);
			return { action: 'leave', id } as LeaveMessage;
		}
		case ServerActions.Transform: {
			const f32 = new Float32Array(bytes, 8);
			const position = Array.from(f32.slice(0, 3)) as Point3;
			const rotation = Array.from(f32.slice(3, 6)) as Vector3;
			const velocity = Array.from(f32.slice(6, 9)) as Vector3;
			return { action: 'transform', id, position, velocity, rotation } as TransformMessage;
		}
		case ServerActions.Spawn: {
			const f32 = new Float32Array(bytes, 8, alignLength - 4);
			const position = Array.from(f32.slice(0, 3)) as Point3;
			const rotation = Array.from(f32.slice(3, 6)) as Vector3;
			const velocity = Array.from(f32.slice(6, 9)) as Vector3;
			const offset = 11;
			const length = u32[offset]; // FIXME this is actually u64
			const chars = new Uint8Array(bytes, offset * 4 + 8, length);
			const prefab = String.fromCharCode(...chars);
			return { action: 'spawn', id, position, rotation, velocity, prefab };
		}
		case ServerActions.Despawn: {
			return { action: 'despawn', id };
		}
		default:
			console.warn("Unknown message", u32);
	}
}

function encodeMessage(message: ClientMessages): ArrayBuffer {
	switch (message.action) {
		case 'login': {
			const enc = new TextEncoder();
			const name = enc.encode(sanitize(message.name));

			const byteLength = name.length + 16;
			const buffer = new ArrayBuffer(byteLength);
			const u32 = new Uint32Array(buffer, 0, 2);
			const u8 = new Uint8Array(buffer, 16);
			u32[0] = ServerActions.Login;
			u32[1] = message.seed;
			u32[2] = name.length;
			u32[3] = 0x0;
			u8.set(name);
			return buffer;
		}

		case 'logout':
			return new Uint32Array([ServerActions.Logout]);

		case 'transform': {
			const { id, position, rotation, velocity } = message;
			const byteLength = (2 + 3 + 3 + 3) * 4;
			const buffer = new ArrayBuffer(byteLength);
			const u32 = new Uint32Array(buffer, 0, 2);
			const f32 = new Float32Array(buffer, 8);
			u32[0] = ServerActions.Transform;
			u32[1] = id;
			f32.set([...position, ...rotation, ...velocity]);
			return buffer;
		}

		case 'spawn': {
			const { id, position, rotation, velocity, prefab } = message;
			const enc = new TextEncoder();
			const prefabBytes = enc.encode(sanitize(prefab));

			const dataLength = (2 + 3 + 3 + 3 + 2) * 4;
			const bufferLength = Math.ceil(prefabBytes.length / 4) * 4 + dataLength;
			const buffer = new ArrayBuffer(bufferLength);
			const u32 = new Uint32Array(buffer, 0);
			const f32 = new Float32Array(buffer, 8);
			u32[0] = ServerActions.Spawn;
			u32[1] = id;
			f32.set([...position, ...rotation, ...velocity]);
			u32[dataLength / 4 - 2] = prefabBytes.length;
			u32[dataLength / 4 - 1] = 0x00; // u64 msb

			// Prefab string starts after data
			const u8 = new Uint8Array(buffer, dataLength);
			u8.set(prefabBytes);
			return buffer;
		}

		case 'despawn': {
			return new Uint32Array([ServerActions.Despawn, message.id]);
		}

		default:
			console.error('Unknown message:', message);
			throw new Error(`Unknown message: ${message}`);
	}
}

function sanitize(value: string) {
	return value.replace(/[^a-zA-Z0-9\s._-]/g, '');
}
