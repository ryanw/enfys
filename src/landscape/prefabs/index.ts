import { Entity } from "engine/ecs";
import { PlayerComponent, TransformComponent, VelocityComponent } from "engine/ecs/components";
import { CameraComponent, FreeCameraComponent, OrbitCameraComponent } from "engine/ecs/components/camera";
import { MeshComponent } from "engine/ecs/components/mesh";
import { World } from "engine/ecs/world";
import { Point3 } from "engine/math";
import { DecorComponent } from "../components/decor";
import { ResourceId } from "engine/resource";
import { TerrainComponent } from "../components/terrain";
import { WaterComponent } from "../components/water";
import { ShipComponent } from "../components/ship";

export function playerPrefab(world: World, position: Point3 = [0, 0, 0]): Entity {
	return world.createEntity([
		new PlayerComponent(),
		new ShipComponent(),
		new TransformComponent(position),
		new VelocityComponent([0, 0, 0]),
		new MeshComponent('player-ship'),
	]);
}

export function orbitCamPrefab(world: World, target: Entity): Entity {
	return world.createEntity([
		new TransformComponent(),
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

export function decorPrefab(world: World, mesh: ResourceId, target?: Entity): Entity {
	return world.createEntity([
		new DecorComponent(mesh, target),
	]);
}

export function terrainPrefab(world: World, seed: number, target?: Entity): Entity {
	return world.createEntity([
		new TerrainComponent(seed, target),
	]);
}

export function waterPrefab(world: World, level: number = 0): Entity {
	return world.createEntity([
		new WaterComponent(level),
	]);
}
