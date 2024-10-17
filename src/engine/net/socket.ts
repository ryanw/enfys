import { Point3, Vector3, Vector4 } from "engine/math";

export enum MessageActions {
	Noop,
	Login,
	Logout,
	Move,
	Join,
	Leave,
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

export interface MoveMessage {
	action: 'move';
	id: number;
	position: Point3;
	velocity: Vector3;
	rotation: Vector3;
}

export type ClientMessages = LoginMessage | LogoutMessage | MoveMessage;
export type ServerMessages = MoveMessage | JoinMessage | LeaveMessage;

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

	move(position: Point3, velocity: Vector3, rotation: Vector3) {
		this.send({ action: 'move', id: -1, position, velocity, rotation });
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
	const u8 = new Uint8Array(bytes);
	switch (u8[0]) {
		case MessageActions.Join: {
			const id = new Uint32Array(bytes, 4, 1)[0];
			const name = String.fromCharCode(...u8.slice(8));
			console.log("Player joined", id, name);
			return { action: 'join', id, name } as JoinMessage;
		}
		case MessageActions.Leave: {
			const id = new Uint32Array(bytes, 4, 1)[0];
			console.log("Player left", id);
			return { action: 'leave', id } as LeaveMessage;
		}
		case MessageActions.Move: {
			const id = new Uint32Array(bytes, 4, 1)[0];
			const f32 = new Float32Array(bytes, 8);
			const position = Array.from(f32.slice(0, 3)) as Point3;
			const velocity = Array.from(f32.slice(3, 6)) as Vector3;
			const rotation = Array.from(f32.slice(6, 9)) as Vector3;
			return { action: 'move', id, position, velocity, rotation } as MoveMessage;
		}
		default:
			console.warn("Unknown message", u8);
	}
}

function encodeMessage(message: ClientMessages): ArrayBuffer {
	switch (message.action) {
		case 'login': {
			const enc = new TextEncoder();
			const name = enc.encode(sanitize(message.name));

			const byteLength = name.length + 8;
			const buffer = new ArrayBuffer(byteLength);
			const u32 = new Uint32Array(buffer, 0, 2);
			const u8 = new Uint8Array(buffer, 8);
			u32[0] = MessageActions.Login;
			u32[1] = message.seed;
			u8.set(name);
			return buffer;
		}

		case 'logout':
			return new Uint8Array([MessageActions.Logout]);

		case 'move': {
			const { position, velocity, rotation } = message;
			const byteLength = (2 + 3 + 3 + 3) * 4;
			const buffer = new ArrayBuffer(byteLength);
			const u8 = new Uint8Array(buffer, 0, 1);
			const f32 = new Float32Array(buffer, 8);
			u8[0] = MessageActions.Move;
			f32.set([...position, ...velocity, ...rotation]);
			return buffer;
		}

		default:
			throw new Error("Unknown message action");
	}
}

function sanitize(value: string) {
	return value.replace(/[^a-zA-Z0-9\s._-]/g, '');
}
