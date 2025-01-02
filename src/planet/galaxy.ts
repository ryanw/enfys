import { Point3, Vector3 } from "engine/math";
import { Randomizer, bigIntRandomizer, bigRandomizer, randomizer } from "engine/noise";

export class StarSystemList {
	constructor(
		public galaxySeed: bigint,
	) {
	}
}

export class Galaxy {
	constructor(
		public galaxySeed: bigint,
	) {
	}

	*starSystems(): Generator<StarSystem> {
		const rng = bigIntRandomizer(this.galaxySeed + 1n);
		let systemSeed;
		for (let i = 0; i < 8; i++) {
			systemSeed = rng();
			const system = new StarSystem(systemSeed);
			yield system;
		}
	}
}

export class StarSystem {
	constructor(
		public systemSeed: bigint,
	) { }

	*stars(): Generator<Star> {
		const rng = bigIntRandomizer(this.systemSeed + 1n);
		const starSeed = rng();
		yield new Star(starSeed, [0, 0, 0]);
	}

	*planets(): Generator<Planet> {
		const rng = bigIntRandomizer(this.systemSeed + 2n);
		const star = this.stars().next().value;
		let orbit = star.radius + 1000;
		let planetSeed;
		for (let i = 0; i < 32; i++) {
			planetSeed = rng();
			orbit += 2000.0;
			const position: Point3 = [orbit, 0, 0];
			const planet = new Planet(planetSeed, position);
			yield planet;
		}
	}
}

export class Star {
	readonly radius: number;
	constructor(
		readonly starSeed: bigint,
		readonly position: Point3,
	) {
		const rng = bigRandomizer(starSeed);
		this.radius = rng(500, 4000);
	}
}

export class Planet {
	readonly radius: number;
	readonly density: number;
	readonly waterLevel: number;

	constructor(
		readonly planetSeed: bigint,
		readonly position: Point3,
	) {
		const rng = bigRandomizer(planetSeed);
		this.radius = rng(200, 700);
		this.density = rng();
		this.waterLevel = rng(0, 100);
	}

	get waterRadius(): number {
		return Math.max(0, this.radius - this.waterLevel);
	}

	get velocity(): Vector3 {
		return [0, 0, 0];
	}
}

export class Moon {
	constructor(
		public moonSeed: bigint,
	) {
	}
}
