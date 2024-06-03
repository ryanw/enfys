import { Gfx } from "engine";
import { SimpleMesh } from "engine/mesh";

export class SkyDome extends SimpleMesh {
	constructor(gfx: Gfx, readonly seed: number) {
		super(gfx);
	}
}
