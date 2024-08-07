import { ColorScheme } from 'engine/color_scheme';
import { randomizer } from 'engine/noise';

export type PlanetSeed = number;
export type TerrainSeed = number;

export class Planet {
	readonly terrainSeed: TerrainSeed;
	readonly terrainColors: ColorScheme;

	constructor(readonly seed: number) {
		const rng = randomizer(seed ^ 0x3ab93df2);
		const nextSeed = () => rng(0, 0xffffffff);
		this.terrainSeed = nextSeed();
		this.terrainColors = new ColorScheme(nextSeed());
	}
}
