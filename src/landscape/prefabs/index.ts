import { Entity, TransformComponent, VelocityComponent, World } from "engine/ecs";

export function playerPrefab(world: World): Entity {
	const player = world.createEntity();
	world.addComponents(
		player,
		new TransformComponent(),
		new VelocityComponent(),
	);
	return player;
}
