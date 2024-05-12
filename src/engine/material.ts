import { Color } from "engine";

export class Material {
	constructor(
		public color: Color = [255, 255, 255, 255],
		public dither: boolean = false,
	) {}

	/**
	 * Returns an ArrayBuffer of bytes for a struct Material{color: vec4f, dither: u32}
	 */
	toArrayBuffer(): ArrayBuffer {
		const buffer = new ArrayBuffer(4 * 5);
		const view = new DataView(buffer);
		for (let i = 0; i < 4; i++) {
			view.setFloat32(i * 4, this.color[i] / 255, true);
		}
		view.setUint32(4 * 4, this.dither ? 1 : 0, true);

		return buffer;
	}
}
