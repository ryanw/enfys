import { Entity } from "engine/ecs";
import { PlayerComponent, TransformComponent, VelocityComponent } from "engine/ecs/components";
import { CameraComponent, FreeCameraComponent, OrbitCameraComponent } from "engine/ecs/components/camera";
import { MaterialComponent } from "engine/ecs/components/material";
import { MeshComponent } from "engine/ecs/components/mesh";
import { PhysicsComponent } from "engine/ecs/components/physics";
import { World } from "engine/ecs/world";
import { Point3, Vector3 } from "engine/math";
import { quaternionFromEuler } from "engine/math/quaternions";
import { GravityComponent } from "./components/gravity";
import { ParticlesComponent } from "engine/ecs/components/particles";

export function orbitCamera(world: World, target: Entity): Entity {
	return world.createEntity([
		new TransformComponent([0, 0, 0], quaternionFromEuler(0.2, -0.2, 0)),
		new CameraComponent(0.1, 10000.0),
		new OrbitCameraComponent(target),
	]);
}

export function freeCamera(world: World): Entity {
	return world.createEntity([
		new TransformComponent([0, 0, -1000]),
		new CameraComponent(0.1, 10000.0),
		new FreeCameraComponent(),
	]);
}


export function star(world: World, position: Point3, scale: number = 1) {
	return world.createEntity([
		new TransformComponent(position, [0, 0, 0, 1], [scale, scale, scale]),
		new MeshComponent('star'),
		new MaterialComponent('star-material'),
		new GravityComponent(16000),
	]);
}

export function planet(world: World, position: Point3, scale: number = 1) {
	return world.createEntity([
		new TransformComponent(position, [0, 0, 0, 1], [scale, scale, scale]),
		new MeshComponent('planet'),
		new PhysicsComponent(),
		new VelocityComponent([0, 0, 200]),
		new MaterialComponent('planet-material'),
		new GravityComponent(1000),
	]);
}

export function moon(world: World, position: Point3, scale: number = 1) {
	return world.createEntity([
		new TransformComponent(position, [0, 0, 0, 1], [scale, scale, scale]),
		new MeshComponent('moon'),
		new PhysicsComponent(),
		new VelocityComponent([0, 50, 140]),
		new MaterialComponent('moon-material'),
		new GravityComponent(10),
	]);
}

export function bug(world: World, position: Point3 = [0, 0, 0]): Entity {
	const scale = 3.0;
	return world.createEntity([
		new PhysicsComponent(),
		new TransformComponent(position, [0, 0, 0, 1], [scale, scale, scale]),
		new VelocityComponent([
			(Math.random() - 0.5) * 200,
			(Math.random() - 0.5) * 200,
			0
		]),
		new MeshComponent('bug-ship'),
		new GravityComponent(1),
	]);
}

export function player(world: World, position: Point3 = [0, 0, 0], velocity: Vector3 = [0,0,0]): Entity {
	const scale = 20.0;
	return world.createEntity([
		new PlayerComponent(),
		new PhysicsComponent(),
		new TransformComponent(position, [0, 0, 0, 1], [scale, scale, scale]),
		new VelocityComponent(velocity),
		new MeshComponent('player-ship'),
		new ParticlesComponent('tiny-cube', 0, true),
	]);
}
