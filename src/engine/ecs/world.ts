import { ComponentConstructor, Entity } from '.';
import { Component } from './components';
import { System } from './systems';
import { PhysicsSystem } from './systems/physics';

type Timeout = ReturnType<typeof setTimeout>;
export class World {
	private entityComponents: Map<Entity, Array<Component>> = new Map();
	private componentsByEntity: Map<Entity, Map<ComponentConstructor, Component>> = new Map();
	private entitiesByComponent: Map<ComponentConstructor, Set<Entity>> = new Map();
	private systems: Array<System> = [];
	private prevEntity: Entity = 0;
	private currentTimer: Timeout | null = null;
	tickrate = 60;

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

	createEntity(components?: Array<Component>): Entity {
		this.prevEntity += 1;
		const entity = this.prevEntity;
		if (components) {
			this.addComponents(entity, components);
		}
		return entity;
	}

	removeEntity(entity: Entity) {
		console.debug("Removing entity", entity);
		this.entityComponents.delete(entity);
		const components = this.componentsByEntity.get(entity);
		this.componentsByEntity.delete(entity);
		if (components) {
			for (const kind of components.keys()) {
				this.entitiesByComponent.get(kind)?.delete(entity);
			}
		}
	}

	addComponents(entity: Entity, components: Array<Component>) {
		for (const comp of components) {
			this.addComponent(entity, comp);
		}
	}

	addComponent(entity: Entity, component: Component) {
		const Constr = component.constructor as ComponentConstructor;
		if (this.hasComponent(entity, Constr)) {
			return this.updateComponent(entity, component);
		}

		if (!this.entitiesByComponent.has(Constr)) {
			!this.entitiesByComponent.set(Constr, new Set());
		}
		if (!this.entityComponents.has(entity)) {
			this.entityComponents.set(entity, []);
		}
		if (!this.componentsByEntity.has(entity)) {
			this.componentsByEntity.set(entity, new Map());
		}

		const components = this.entityComponents.get(entity)!;
		components.push(component);

		const entitiesByComponent = this.entitiesByComponent.get(Constr)!;
		entitiesByComponent.add(entity);

		const componentsByEntity = this.componentsByEntity.get(entity)!;
		componentsByEntity.set(Constr, component);
	}

	private updateComponent(entity: Entity, component: Component) {
		const Constr = component.constructor as ComponentConstructor;
		const components = this.entityComponents.get(entity)!.filter(c => !(c instanceof Constr));
		components.push(component);
		this.entityComponents.set(entity, components);
	}

	addSystem(system: System) {
		this.systems.push(system);
		system.setup(this);
	}

	async tick(dt: number) {
		return Promise.all(this.systems.map(s => s.tick(dt, this)));
	}

	hasComponent<T extends Component>(entity: Entity, typ: ComponentConstructor<T>): boolean {
		return this.entitiesByComponent.get(typ)?.has(entity) || false;
	}

	getComponent<T extends Component>(entity: Entity, typ: ComponentConstructor<T>): T | undefined {
		const components = this.componentsByEntity.get(entity) || new Map();
		return components.get(typ);
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
}

