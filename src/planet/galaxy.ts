import { Matrix4, Point3, Quaternion, Vector3 } from "engine/math";
import { multiply } from "engine/math/transform";
import { quaternionFromEuler } from "engine/math/quaternions";
import { multiplyVector, rotation, rotationFromQuaternion, transformPoint } from "engine/math/transform";
import { Randomizer, bigIntRandomizer, bigRandomizer, randomizer } from "engine/noise";
import { magnitude } from "engine/math/vectors";

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
	readonly planetCount: number;
	constructor(
		public systemSeed: bigint,
	) {
		const rng = bigRandomizer(this.systemSeed + 3240n);
		this.planetCount = rng(3, 16) | 0;
	}

	*stars(): Generator<Star> {
		const rng = bigIntRandomizer(this.systemSeed + 1n);
		const starSeed = rng();
		yield new Star(starSeed, [0, 0, 0]);
	}

	*planets(): Generator<Planet> {
		const rngi = bigIntRandomizer(this.systemSeed + 435543n);
		const rngf = bigRandomizer(this.systemSeed + 435543n);
		const star = this.stars().next().value;
		let orbit = star.radius + 0;
		let planetSeed;
		for (let i = 0; i < this.planetCount; i++) {
			planetSeed = rngi();
			const planet = new Planet(planetSeed, orbit + rngf(200.0, 1000.0));
			orbit = magnitude(planet.positionAtTime(0)) + planet.radius * 2.0;
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
	readonly orbitOffset: number;
	readonly orbitSpeed: number;
	readonly orbitTilt: Quaternion;

	constructor(
		readonly planetSeed: bigint,
		readonly orbitRadius: number,
	) {
		const rng = bigRandomizer(planetSeed);
		this.radius = rng(200, 700);
		this.density = rng();
		this.waterLevel = rng(0, 100);
		this.orbitOffset = rng(0.0, Math.PI * 2);
		this.orbitSpeed = rng(0.0, 1.0);
		this.orbitTilt = quaternionFromEuler(0, 0, rng(0.0, Math.PI / 2.0));
	}

	get waterRadius(): number {
		return Math.max(0, this.radius - this.waterLevel);
	}

	get velocity(): Vector3 {
		return [0, 0, 0];
	}

	positionAtTime(time: number): Point3 {
		const orbitTime = 1.0;
		const angle = (this.orbitOffset + time / orbitTime) * this.orbitSpeed;
		const start: Point3 = [this.orbitRadius, 0, 0];
		const rot = multiply(rotationFromQuaternion(this.orbitTilt), rotation(0, angle, 0));
		return transformPoint(rot, start);
	}
}

export class Moon {
	constructor(
		public moonSeed: bigint,
	) {
	}
}
