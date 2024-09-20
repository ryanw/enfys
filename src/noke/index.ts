/**
 * A very simple demo
 *
 * @module
 */

import { Gfx } from 'engine';
import { QUAD_VERTS } from 'engine/mesh';
import { Camera, ProjectionKind } from 'engine/camera';
import { Scene } from 'engine/scene';
import { translation } from 'engine/math/transform';
import { SpriteMesh, SpriteVertex } from 'engine/pipelines/render_sprite';
import { SandBuffer } from './sand_buffer';
import { RenderSandPipeline } from './pipelines/render_sand';
import { SandMaterial } from './sand_material';
import { SimulatePipeline } from './pipelines/simulate';
import { Point2, Vector2 } from 'engine/math';
import { add, scale, subtract } from 'engine/math/vectors';

let currentMaterial: number = 1;

/**
 * Mesh shaped like an Cube
 */
class Quad extends SpriteMesh {
	constructor(gfx: Gfx, size: [number, number]) {
		const vertices = QUAD_VERTS.map(v => {
			return {
				position: [v[0] * size[0], v[1] * size[1], v[2]],
				uv: [v[0] + 0.5, v[1] + 0.5],
			} as SpriteVertex
		});
		super(gfx, vertices);
	}
}


/**
 * Start the demo
 */
export async function main(el: HTMLCanvasElement): Promise<Gfx> {
	if (el.tagName !== 'CANVAS') throw new Error('Element is not a canvas');
	const gfx: Gfx = await Gfx.attachNotified(el);
	gfx.framecap = 60;
	gfx.canvasPixelRatio = 1 / 1;
	gfx.configure({ drawEdges: true });
	// Custom renderer for our sand data
	gfx.registerMaterial(SandMaterial, new RenderSandPipeline(gfx));


	const camera = new Camera(gfx, ProjectionKind.Orthographic);
	//const cameraController = new FreeCameraController(el, camera);
	const scene = new Scene(gfx);

	const spriteScale = 1;
	const arenaSize: Point2 = [1920, 1080]
	const sand = new SandBuffer(gfx, arenaSize);



	const sprite = scene.addMesh(
		new Quad(gfx, [arenaSize[0] * spriteScale, arenaSize[1] * spriteScale]),
		new SandMaterial(gfx, sand),
		translation(0, 0, 1000),
	);

	const simulation = new SimulatePipeline(gfx);
	attachMouseHandlers(gfx.canvas, sand, simulation);

	simulation.init(sand);
	function update(dt: number) {
		simulation.tick(sand);
	}

	gfx.run(async (dt) => {
		//cameraController.update(dt);
		update(dt);
		await gfx.draw(scene, camera);
	});

	return gfx;
}


function attachMouseHandlers(el: HTMLElement, sand: SandBuffer, sim: SimulatePipeline) {
	function onMouseUp() {
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
	}
	function onMouseDown(e: MouseEvent) {
		e.preventDefault();
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
		drawMouse(e);
	}
	function onMouseMove(e: MouseEvent) {
		drawMouse(e);
	}
	function onClickMaterial(e: MouseEvent) {
		const el = e.target as HTMLButtonElement;
		currentMaterial = parseInt(el.dataset.material || '0');
	}
	function drawMouse(e: MouseEvent) {
		const { offsetX, offsetY } = e;
		sim.paint(sand, elementToTexture(el, [offsetX, offsetY]), currentMaterial, 24);
	}
	el.addEventListener('mousedown', onMouseDown);

	const buttons = document.createElement('div');
	buttons.style.position = 'fixed';
	buttons.style.left = '0';
	buttons.style.top = '0';
	buttons.style.zIndex = '100';

	buttons.innerHTML = `
		<button data-material="0" type="button">Air</button>
		<button data-material="1" type="button">Sand</button>
		<button data-material="2" type="button">Stone</button>
		<button data-material="3" type="button">Water</button>
	`;
	buttons.addEventListener('click', onClickMaterial);
	el.parentElement!.appendChild(buttons);
}

/**
 * Transform a point from html document space into sand texture space
 */
function elementToTexture(el: HTMLElement, p: Point2): Point2 {
	// FIXME figure out where things really are
	// Assuming texture is always centred on screen
	const texSize: Vector2 = [1920, 1080];
	const { clientWidth, clientHeight } = el;
	const diff = scale(subtract(texSize, [clientWidth, clientHeight]), 0.5);
	return add([p[0], clientHeight - p[1]], diff);
}

