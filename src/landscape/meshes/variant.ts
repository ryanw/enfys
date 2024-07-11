import { Gfx } from 'engine';
import { ColorVertex, SimpleMesh } from 'engine/mesh';

export abstract class VariantMesh extends SimpleMesh {
	constructor(gfx: Gfx, readonly seed: number, variantCount: number = 32) {
		super(gfx, []);
		const models: Array<Array<ColorVertex>> = [];

		for (let i = 0; i < variantCount; i++) {
			const model = this.generateVariant(i);
			if (i > 0 && model.length !== models[0].length) {
				throw new Error("All variants must have the same number of vertices");
			}
			models.push(model);
		}

		this.uploadVertices(models.flat(), models[0].length);
	}

	abstract generateVariant(i: number): Array<ColorVertex>;
}

