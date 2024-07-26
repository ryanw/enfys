import { Color } from 'engine/color';
import { Component } from '.';
import { Vector4 } from 'engine/math';

export class MaterialComponent extends Component {
	public emissive = false;
	public color: Color = [255, 0, 0, 255];
	public noise: Vector4 = [0, 0, 0, 0];

	constructor(values?: Partial<MaterialComponent>) {
		super();
		if (values) {
			Object.assign(this, values);
		}
	}
}
