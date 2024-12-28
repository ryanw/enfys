/**
 * A very simple demo
 *
 * @module
 */

import { Gfx } from 'engine';
import { QuaternionCamera } from 'engine/camera';
import { Scene } from 'engine/scene';
import { identity, multiply, rotation, scaling, translation } from 'engine/math/transform';
import { OrbitCameraController } from 'engine/input/orbit_camera';
import { Matrix4, Point3 } from 'engine/math';
import { colorToBigInt, hsl } from 'engine/color';
import { randomizer } from 'engine/noise';
import { magnitude } from 'engine/math/vectors';
import { Icosphere } from 'engine/meshes/icosphere';
import { PlanetMaterial } from './materials/planet';
import { RenderPlanetPipeline } from './pipelines/render_planet';
import { FreeCameraController } from 'engine/input/free_camera';

const PLANET_COUNT = 8;
const PLANET_SPREAD = 320;
const PLANET_SIZE = [3.0, 3.0];

/**
 * Start the demo
 */
export async function main(el: HTMLCanvasElement): Promise<Gfx> {
	if (el.tagName !== 'CANVAS') throw new Error('Element is not a canvas');
	const gfx: Gfx = await Gfx.attachNotified(el);
	gfx.configure({ renderMode: 0, ditherSize: 0, drawShadows: false, drawEdges: 0 });
	gfx.registerMaterials([
		[PlanetMaterial, RenderPlanetPipeline],
	]);


	const camera = new QuaternionCamera(gfx);
	camera.near = 0.01;
	//const cameraController = new OrbitCameraController(el, camera);
	const cameraController = new FreeCameraController(el, camera);
	const scene = new Scene(gfx);

	const mesh = new Icosphere(gfx, 6);
	scene.addMesh(mesh, new PlanetMaterial(gfx, Math.random() * 100000 |0));

	const planetRange = PLANET_SIZE[1] - PLANET_SIZE[0];
	const icos: Array<[number, Matrix4]> = Array.from({ length: PLANET_COUNT }, () => {
		let point: Point3 = [0, 0, 0];
		let mag = magnitude(point);
		while (mag === 0 || mag > PLANET_SPREAD) {
			const x = (Math.random() - 0.5) * 2 * PLANET_SPREAD;
			const y = (Math.random() - 0.5) * 2 * PLANET_SPREAD;
			const z = (Math.random() - 0.5) * 2 * PLANET_SPREAD;
			point = [x, y, z];
			mag = magnitude(point);
		}

		const transform = multiply(
			mesh.instanceCount === 0 ? identity() : translation(...point),
			scaling((Math.random() * 2.0 * planetRange) + PLANET_SIZE[0]),
		);
		const idx = mesh.pushInstance({
			instanceColor: colorToBigInt(hsl(Math.random(), 1.0, 0.5)),
			transform,
			variantIndex: 0,
			live: 1
		});

		return [idx, transform];
	});

	function update(dt: number) {
		const rnd = randomizer(123);
		for (const pair of icos) {
			const [idx, oldTransform] = pair;
			const transform = multiply(oldTransform, rotation(0, 1 * dt, 0));
			pair[1] = transform;
			mesh.writeInstance(idx, {
				instanceColor: colorToBigInt(hsl(( rnd() + performance.now()/10000.0 ) % 1, 0.5, 0.5)),
				transform,
				variantIndex: 0,
				live: 1
			});
		}
	}

	gfx.run(async (dt) => {
		cameraController.update(dt);
		//update(dt);
		await gfx.draw(scene, camera);
	});

	return gfx;
}
