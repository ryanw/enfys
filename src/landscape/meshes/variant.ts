import { Gfx } from 'engine';
import { ColorInstance, ColorVertex, SimpleMesh } from 'engine/mesh';

export class VariantMesh extends SimpleMesh {
	constructor(gfx: Gfx, readonly seed: number, variantCount: number = 32, instances?: Array<ColorInstance>) {
		super(gfx, [], instances);
		const models: Array<Array<ColorVertex>> = [];

		for (let i = 0; i < variantCount; i++) {
			const model = this.generateVariant(i);
			models.push(model);
		}

		padModels(models);
		this.uploadVertices(models.flat(), models[0].length);
		this.instanceCount = instances?.length ?? 0;
	}

	generateVariant(i: number): Array<ColorVertex> {
		return [];
	}
}

function padModels(models: Array<Array<ColorVertex>>): Array<Array<ColorVertex>> {
	const biggest = models.reduce((p, model) => Math.max(p, model.length), 0)
	for (const model of models) {
		while (model.length < biggest) {
			model.push(model[0]);
		}
	}
	return models;
}
