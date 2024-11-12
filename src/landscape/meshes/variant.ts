import { Gfx } from 'engine';
import { Point3 } from 'engine/math';
import { ColorInstance, ColorVertex, SimpleMesh } from 'engine/mesh';

export class VariantMesh extends SimpleMesh {
	constructor(gfx: Gfx, readonly seed: number = 123, variantCount: number = 1, scale: number = 1, instances?: Array<ColorInstance>) {
		super(gfx, [], instances);
		const models: Array<Array<ColorVertex>> = [];

		for (let i = 0; i < variantCount; i++) {
			const model = this.generateVariant(i);
			model.forEach(v => v.position = v.position.map(n => n * scale) as Point3);
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
