import { Entity } from 'engine/ecs';
import { Component, GunComponent, NetworkComponent, PlayerComponent, TransformComponent, VelocityComponent } from 'engine/ecs/components';
import { CameraComponent, FreeCameraComponent, OrbitCameraComponent } from 'engine/ecs/components/camera';
import { MeshComponent } from 'engine/ecs/components/mesh';
import { World } from 'engine/ecs/world';
import { Point3, Vector3 } from 'engine/math';
import { ResourceId } from 'engine/resource';
import { WaterComponent } from '../components/water';
import { ShipComponent } from '../components/ship';
import { LightComponent } from 'engine/ecs/components/light';
import { ParticlesComponent } from 'engine/ecs/components/particles';
import { PhysicsComponent } from 'engine/ecs/components/physics';
import { Planet } from '../planet';
import { DecorComponent } from 'engine/ecs/components/decor';
import { TerrainComponent } from 'engine/ecs/components/terrain';
import { InsectComponent } from '../components/insect';
import { MaterialComponent } from 'engine/ecs/components/material';
import { SoundComponent } from 'engine/ecs/components/sound';

export function lightPrefab(world: World, rotation: Vector3 = [0, 0, 0]): Entity {
	return world.createEntity([
		new LightComponent(),
		new TransformComponent([0, 0, 0], rotation),
	]);
}

export function opponentPrefab(world: World, position: Point3 = [0, 0, 0]): Entity {
	return world.createEntity([
		new ShipComponent(),
		new TransformComponent(position),
		new MeshComponent('player-ship'),
	]);
}

export function laserPrefab(world: World, networked: boolean, position: Point3, rotation: Vector3, velocity: Vector3): Entity {
	const components: Array<Component> = [
		new TransformComponent(position, rotation),
		new VelocityComponent(velocity),
		new PhysicsComponent(0, 0),
		new MeshComponent('laser'),
	];
	if (networked) {
		components.push(new NetworkComponent());
	}
	return world.createEntity(components);
}

export function bombPrefab(world: World, networked: boolean, position: Point3, rotation: Vector3, velocity: Vector3): Entity {
	const components: Array<Component> = [
		new TransformComponent(position, rotation),
		new VelocityComponent(velocity),
		new PhysicsComponent(),
		new MeshComponent('bomb'),
	];
	if (networked) {
		components.push(new NetworkComponent());
	}
	return world.createEntity(components);
}

export function playerPrefab(world: World, position: Point3 = [0, 0, 0]): Entity {
	return world.createEntity([
		new PlayerComponent(),
		new GunComponent(),
		new SoundComponent('thruster', false, 0.5, true),
		new PhysicsComponent(),
		new ParticlesComponent('tiny-cube', 0, true),
		new ShipComponent(),
		new TransformComponent(position),
		new VelocityComponent([0, 0, 0]),
		new MeshComponent('player-ship'),
	]);
}

export function animalPrefab(world: World, mesh: ResourceId, position: Point3 = [0, 0, 0]): Entity {
	return world.createEntity([
		new PhysicsComponent(),
		new InsectComponent(),
		new TransformComponent(position),
		new VelocityComponent([0, 0, 0]),
		new MeshComponent(mesh),
	]);
}

export function orbitCamPrefab(world: World, target: Entity): Entity {
	return world.createEntity([
		new TransformComponent([0, 0, 0], [0.3, 0, 0]),
		new CameraComponent(),
		new OrbitCameraComponent(target),
	]);
}

export function freeCamPrefab(world: World): Entity {
	return world.createEntity([
		new TransformComponent(),
		new CameraComponent(),
		new FreeCameraComponent(),
	]);
}

let decorRngIdx = 0;
export function decorPrefab(world: World, mesh: ResourceId, seed: number, spread: number, radius: number, target?: Entity): Entity {
	const idx = decorRngIdx;
	decorRngIdx += 1;
	return world.createEntity([
		new DecorComponent(mesh, seed + idx * 3211.4, spread, radius, target),
	]);
}

export function terrainPrefab(world: World, seed: number, target?: Entity): Entity {
	const { terrainSeed, terrainColors } = new Planet(seed); 255
	return world.createEntity([
		new TerrainComponent(terrainSeed, terrainColors.seed, target),
		new MaterialComponent({ color: [255, 150, 0, 255] }),
	]);
}

export function waterPrefab(world: World, level: number = 0): Entity {
	return world.createEntity([
		new WaterComponent(level),
	]);
}
