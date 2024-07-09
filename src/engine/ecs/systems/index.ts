import { World } from '../world';

export abstract class System {
	setup(world: World): void {};
	teardown(world: World): void {};
	abstract tick(dt: number, world: World): Promise<void>;
}
