import { Point3, Vector3 } from "engine/math";
import { add, scale } from "engine/math/vectors";

export type Entity = number;
export abstract class Component { }
export abstract class System {
	abstract setup(): void;
	abstract teardown(): void;
	abstract tick(dt: number, world: World): Promise<void>;
}

export type ComponentConstructor<T extends Component = Component> = new (...args: any) => T;

export class VelocityComponent extends Component {
	constructor(
		public velocity: Vector3 = [0, 0, 0],
	) { 
		super();
	}
}

export class TransformComponent extends Component {
	constructor(
		public position: Point3 = [0, 0, 0],
		public rotation: Vector3 = [0, 0, 0],
		public scale: Vector3 = [1, 1, 1],
	) { 
		super();
	}
}

export class PhysicsSystem extends System {
	setup() {
	}

	teardown() {
	}

	async tick(dt: number, world: World) {
		const entities = world.entitiesWithComponents([VelocityComponent, TransformComponent]);
		for (const entity of entities) {
			const tra = world.getComponent(entity, TransformComponent)!;
			const vel = world.getComponent(entity, VelocityComponent)!;
			tra.position = add(tra.position, scale(vel.velocity, dt));
		}
	}
}

type Timeout = ReturnType<typeof setTimeout>;
export class World {
	private entityComponents: Map<Entity, Array<Component>> = new Map();
	private componentsByType: Map<ComponentConstructor, Array<Component>> = new Map();
	private entitiesByComponent: Map<ComponentConstructor, Set<Entity>> = new Map();
	private systems: Array<System> = [];
	private prevEntity: Entity = 0;
	private currentTimer: Timeout | null = null;
	tickrate = 60;

	constructor() {
		this.addSystem(new PhysicsSystem());
	}

	run() {
		const tick = async () => {
			const now = performance.now();
			const dt = (1000 / this.tickrate);
			await this.tick(dt / 1000);

			const ft = performance.now() - now;
			const delay = Math.max(0, dt - ft);
			this.currentTimer = setTimeout(tick, delay);
		};
		tick();
	}

	stop() {
		if (this.currentTimer) {
			clearTimeout(this.currentTimer);
			this.currentTimer = null;
		}
	}

	createEntity(): Entity {
		this.prevEntity += 1;
		return this.prevEntity;
	}

	addComponent(entity: Entity, component: Component) {
		const Constr = component.constructor as ComponentConstructor;
		if (!this.componentsByType.has(Constr)) {
			!this.componentsByType.set(Constr, []);
		}
		if (!this.entitiesByComponent.has(Constr)) {
			!this.entitiesByComponent.set(Constr, new Set());
		}
		if (!this.entityComponents.has(entity)) {
			this.entityComponents.set(entity, []);
		}
		const components = this.entityComponents.get(entity)!;
		components.push(component);

		const byType = this.componentsByType.get(Constr)!;
		byType.push(component);

		const entitiesByComponent = this.entitiesByComponent.get(Constr)!;
		entitiesByComponent.add(entity);
	}

	addComponents(entity: Entity, ...components: Array<Component>) {
		for (const comp of components) {
			this.addComponent(entity, comp);
		}
	}

	addSystem(system: PhysicsSystem) {
		this.systems.push(system);
	}

	async tick(dt: number) {
		return Promise.all(this.systems.map(s => s.tick(dt, this)));
	}

	getComponent<T extends Component>(entity: Entity, typ: ComponentConstructor<T>): T | undefined {
		const components = this.entityComponents.get(entity) || [];
		for (const comp of components) {
			if (comp instanceof typ) {
				return comp;
			}
		}
	}

	entitiesWithComponent(typ: ComponentConstructor): Set<Entity> {
		return new Set([...this.entitiesByComponent.get(typ) || []]);
	}

	entitiesWithComponents(types: Array<ComponentConstructor>): Set<Entity> {
		let entities: Set<Entity> | null = null;
		for (const typ of types) {
			const subset = this.entitiesByComponent.get(typ) || new Set();
			if (entities) {
				entities = new Set([...entities].filter((e: Entity) => subset.has(e)));
			}
			else {
				entities = new Set([...subset]);
			}
		}

		return entities || new Set();
	}

	getComponents<T extends Component>(typ: ComponentConstructor<T>): Array<T> {
		return [...this.componentsByType.get(typ) as Array<T>];
	}
}
