export class Gfx {
	canvas!: HTMLCanvasElement;
	context!: GPUCanvasContext;

	constructor(private container: HTMLElement) {
		this.createCanvas();
	}

	private createCanvas() {
		this.canvas = document.createElement('canvas');
		this.container.appendChild(this.canvas);
		const context = this.canvas.getContext('webgpu');
		if (!context) {
			alert('WebGPU not supported by your browser');
			throw new Error('WebGPU not supported by your browser');
		}
		this.context = context;
	}
}
