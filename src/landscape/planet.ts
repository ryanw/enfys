import { ColorScheme } from 'engine/color_scheme';
import { randomizer } from 'engine/noise';

export type PlanetSeed = number;
export type Seed = number;

export class Planet {
	readonly terrainSeed: Seed;
	readonly colorSeed: Seed;
	readonly terrainColors: ColorScheme;

	constructor(readonly seed: number) {
		const rng = randomizer(seed ^ 0x3ab93df2);
		const nextSeed = () => rng(0, 0xffffffff);
		this.terrainSeed = nextSeed();
		this.colorSeed = nextSeed();
		this.terrainColors = ColorScheme.random(this.colorSeed);
	}
}
