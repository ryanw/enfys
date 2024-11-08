import { calculateNormals } from 'engine';
import { Point3, Vector2, Vector3 } from 'engine/math';
import { ColorVertex, buildCylinder, buildIcosahedron, buildIcosphere } from 'engine/mesh';
import { add, dot, magnitude, normalize, scale, subtract } from 'engine/math/vectors';
import { randomizer } from 'engine/noise';
import { VariantMesh } from './variant';
import { LSystem } from '../lsystem';
import { multiply, multiplyVector, rotation, rotationFromVector, transformPoint, translation } from 'engine/math/transform';
import { colorToInt, hsl } from 'engine/color';

function buildBranch(p0: Point3, p1: Point3, radius: number = 1.0): Array<ColorVertex> {
	const mid = scale(add(p0, p1), 0.5);
	const h = magnitude(subtract(p0, p1));
	const dir = normalize(subtract(p1, p0));
	const branchRotation = rotationFromVector(dir, dir[1] >= 0 ? [0, 1, 0] : [0, -1, 0]);
	const branchTranslate = translation(...mid);
	const transform = multiply(branchTranslate, branchRotation);
	return buildCylinder(h, radius, [4, 1]).map(position => {
		const p = transformPoint(transform, position);
		return {
			softness: 0,
			position: p,
			normal: [0, 0, 0],
			color: BigInt(0xff20689a),
		} as ColorVertex;
	});
}

function buildBush(position: Point3, radius: number = 1, color: number = 0xff209a68): Array<ColorVertex> {
	return buildIcosphere(0, false, p => ({
		softness: 0.4,
		position: add(scale(p, radius), position),
		normal: [0, 0, 0],
		color: BigInt(color),
	}) as ColorVertex);
}

export class TreeMesh extends VariantMesh {
	override generateVariant(i: number): Array<ColorVertex> {
		const seed = this.seed + i * 3121;
		const rnd = randomizer(seed);
		const getSoftness = (p: Point3) => {
			const { pow, min, max } = Math;
			return pow(min(1, max(0, p[1] - 3.0)), 0.8);
		};

		let vertices: ColorVertex[] = [];

		const l = new LSystem({ F: 'FF+[+F-F-F]-[-F+F+F]' });
		l.start('F');
		l.step(2);

		const colors = [
			colorToInt(hsl(rnd(), rnd(0.4, 0.7), rnd(0.4, 0.7))),
			colorToInt(hsl(rnd(), rnd(0.4, 0.7), rnd(0.4, 0.7))),
			colorToInt(hsl(rnd(), rnd(0.4, 0.7), rnd(0.4, 0.7))),
		];

		let p: Point3 = [0, 0, 0];
		let dir: Vector3 = [0, 1, 0];
		let stack: Array<[Point3, Vector3]> = [];
		let branchLength = 1.5;
		let branchThickness = 0.3;
		const bts = 1.9;
		const bls = 1.4;
		for (const chr of l.axiom.split('')) {
			switch (chr) {
				case 'F':
					const p0: Point3 = [...p];
					const p1: Point3 = add(p, scale(dir, branchLength));
					vertices = [...vertices, ...buildBranch(p0, p1, branchThickness)];
					p = p1;
					break;
				case '+': {
					let rot = rotation(0, 0, Math.PI / 6);
					if (rnd() < 0.5) {
						rot = multiply(rot, rotation(0, Math.PI / 4, 0));
					}
					else {
						rot = multiply(rot, rotation(0, -Math.PI / 4, 0));
					}
					dir = multiplyVector(rot, dir);
					break;
				}
				case '-': {
					let rot = rotation(0, 0, -Math.PI / 6);
					if (rnd() < 0.5) {
						rot = multiply(rot, rotation(0, Math.PI / 4, 0));
					}
					else {
						rot = multiply(rot, rotation(0, -Math.PI / 4, 0));
					}
					dir = multiplyVector(rot, dir);
					break;
				}
				case '[':
					branchLength /= bls;
					branchThickness /= bts;
					stack.push([p, dir]);
					break;
				case ']':
					// Add leaves
					if (rnd() < 0.9) {
						const bushColor = colors[rnd(0, colors.length) | 0];
						vertices = [...vertices, ...buildBush(p, rnd(branchThickness * 5, branchThickness * 8), bushColor)];
					}
					branchLength *= bls;
					branchThickness *= bts;
					[p, dir] = stack.pop()!;
					break;
			}
		}

		//vertices.forEach(v => v.softness = getSoftness(v.position));

		calculateNormals(vertices);
		return vertices;
	}
}

