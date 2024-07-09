import { Color } from "engine";
import { hsl } from "engine/color";
import { randomizer, Randomizer } from "engine/noise";

export class ColorScheme {
	private rnd: Randomizer;
	private _colors: Array<Color>;

	constructor(
		public seed: number,
	) {
		const rnd = randomizer(seed);
		this.rnd = rnd;
		const rndColor = (s: number = 0.5, l: number = 0.5) => hsl(rnd(0.0, 1.0), s, l);


		const water = rndColor(0.6, 0.3);
		const beach = rndColor(0.3, 0.6);
		const lush = rndColor(0.6, 0.5);
		const dry = rndColor(0.3, 0.5);
		const soil = rndColor(0.5, 0.3);
		const sand = rndColor(0.3, 0.5);
		const rock = rndColor(0.2, 0.7);
		const snow = rndColor(0.1, 0.9);

		this._colors = [
			beach,
			beach,
			lush,
			lush,
			lush,
			lush,
			lush,
			lush,
			lush,
			lush,
			soil,
			soil,
			soil,
			soil,
			soil,
			soil,
			soil,
			soil,
			rock,
			rock,
			rock,
			rock,
			rock,
			snow,
			snow,
		];
	}

	colors(): Array<Color> {
		// FIXME deep clone
		return [...this._colors];
	}
}

