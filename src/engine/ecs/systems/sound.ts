import { System } from '.';
import { Entity } from '..';
import { SoundComponent } from '../components/sound';
import { World } from '../world';
import { Sound } from 'engine/sound';

export class SoundSystem extends System {
	private playing: Set<Entity> = new Set();

	constructor(private sound: Sound) {
		super();
	}

	async tick(dt: number, world: World) {
		const entities = world.entitiesWithComponent(SoundComponent);

		for (const entity of entities) {
			const { playing, soundId } = world.getComponent(entity, SoundComponent)!;

			if (this.playing.has(entity)) {
				if (!playing) {
					// Stopped playing
					this.sound.stop(soundId);
					this.playing.delete(entity);
				}
				continue;
			}

			if (!playing) {
				continue;
			}

			this.sound.play(soundId);
			this.playing.add(entity);
		}
	}
}
