import { Entity } from "engine/ecs";
import { TransformComponent } from "engine/ecs/components";
import { CameraComponent, FreeCameraComponent, OrbitCameraComponent } from "engine/ecs/components/camera";
import { MaterialComponent } from "engine/ecs/components/material";
import { MeshComponent } from "engine/ecs/components/mesh";
import { World } from "engine/ecs/world";
import { Point3 } from "engine/math";
import { quaternionFromEuler } from "engine/math/quaternions";

export function orbitCamera(world: World, target: Entity): Entity {
	return world.createEntity([
		new TransformComponent([0, 0, 0], quaternionFromEuler(0.2, -0.2, 0)),
		new CameraComponent(true),
		new OrbitCameraComponent(target, [0, 2, -4]),
	]);
}

export function freeCamera(world: World): Entity {
	return world.createEntity([
		new TransformComponent(),
		new CameraComponent(true),
		new FreeCameraComponent(),
	]);
}


export function planet(world: World, position: Point3, scale: number = 1) {
	return world.createEntity([
		new TransformComponent(position, [0, 0, 0, 1], [scale, scale, scale]),
		new MeshComponent('planet'),
		new MaterialComponent('planet-material'),
	]);
}
