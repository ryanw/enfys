import { Entity} from "engine/ecs";
import { TransformComponent, VelocityComponent } from "engine/ecs/components";
import { CameraComponent, FreeCameraComponent, OrbitCameraComponent } from "engine/ecs/components/camera";
import { MeshComponent } from "engine/ecs/components/mesh";
import { World } from "engine/ecs/world";

export function playerPrefab(world: World): Entity {
	const player = world.createEntity();
	world.addComponents(
		player,
		new TransformComponent([0, 0, 10]),
		new VelocityComponent([0, 0, 0]),
		new MeshComponent('player-ship'),
	);
	return player;
}

export function orbitCamPrefab(world: World, target: Entity): Entity {
	const camera = world.createEntity();
	world.addComponents(
		camera,
		new TransformComponent(),
		new CameraComponent(),
		new OrbitCameraComponent(target),
	);
	return camera;
}

export function freeCamPrefab(world: World): Entity {
	const camera = world.createEntity();
	world.addComponents(
		camera,
		new TransformComponent(),
		new CameraComponent(),
		new FreeCameraComponent(),
	);
	return camera;
}
