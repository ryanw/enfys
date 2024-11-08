import { Entity } from "engine/ecs";
import { TransformComponent, VelocityComponent } from "engine/ecs/components";
import { LightComponent } from "engine/ecs/components/light";
import { MaterialComponent } from "engine/ecs/components/material";
import { MeshComponent } from "engine/ecs/components/mesh";
import { TerrainComponent } from "engine/ecs/components/terrain";
import { World } from "engine/ecs/world";
import { Point3, Vector3 } from "engine/math";
import { VehicleComponent } from "./components/vehicle";
import { CameraComponent, FreeCameraComponent, OrbitCameraComponent } from "engine/ecs/components/camera";
import { ResourceId } from "engine/resource";
import { DecorComponent } from "engine/ecs/components/decor";

const CAR_SPEED = 16.0;

export function orbitCamera(world: World, target: Entity): Entity {
	return world.createEntity([
		new TransformComponent([0, 0, 0], [0.1, 0, 0]),
		new CameraComponent(),
		new OrbitCameraComponent(target, [0, 3, -4]),
	]);
}

export function freeCamera(world: World): Entity {
	return world.createEntity([
		new TransformComponent(),
		new CameraComponent(),
		new FreeCameraComponent(),
	]);
}

export function light(world: World, rotation: Vector3 = [0, 0, 0]): Entity {
	return world.createEntity([
		new LightComponent(),
		new TransformComponent([0, 0, 0], rotation),
	]);
}

export function sky(world: World, scale: number = 1) {
	return world.createEntity([
		new TransformComponent([0, 0, 0], [0, 0, 0], [scale, scale, scale]),
		new VelocityComponent([0, 0, CAR_SPEED]),
		new MeshComponent('sky'),
		new MaterialComponent('sky-material'),
	]);
}

export function sun(world: World, position: Point3, scale: number = 1) {
	return world.createEntity([
		new TransformComponent(position, [0, 0, 0], [scale, scale, scale]),
		new VelocityComponent([0, 0, CAR_SPEED]),
		new MeshComponent('sun'),
		new MaterialComponent('sun-material'),
	]);
}

export function planet(world: World, position: Point3, scale: number = 1) {
	return world.createEntity([
		new TransformComponent(position, [0, 0, 0], [scale, scale, scale]),
		new VelocityComponent([0, 0, CAR_SPEED]),
		new MeshComponent('planet'),
		new MaterialComponent('planet-material'),
	]);
}

export function road(world: World, position: Point3) {
	return world.createEntity([
		new TransformComponent(position),
		new VelocityComponent([0, 0, CAR_SPEED]),
		new MeshComponent('road'),
		new MaterialComponent('road-material'),
	]);
}

export function car(world: World, position: Point3) {
	return world.createEntity([
		new TransformComponent(position),
		new VelocityComponent([0, 0, CAR_SPEED]),
		new VehicleComponent(),
		new MeshComponent('car'),
		new MaterialComponent('car-material'),
	]);
}

export function building(world: World, position: Point3, size: Vector3 = [1, 1, 1]) {
	return world.createEntity([
		new TransformComponent(
			[position[0], position[1] + size[1], position[2]],
			[0, 0, 0],
			size,
		),
		new MeshComponent('building'),
	]);
}

export function terrain(world: World, target?: Entity) {
	return world.createEntity([
		new TransformComponent(),
		new TerrainComponent(431, 456, target, false, [64, 256]),
		new MaterialComponent('terrain-material'),
	]);
}

let decorRngIdx = 0;
export function decor(world: World, mesh: ResourceId, seed: number, spread: number, radius: number, target?: Entity): Entity {
	const idx = decorRngIdx;
	decorRngIdx += 1;
	return world.createEntity([
		new DecorComponent(mesh, seed + idx, spread, radius, target),
	]);
}
