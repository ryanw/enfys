export type Rules = Record<string, string>;

export class LSystem {
	constructor(public rules: Rules, public axiom: string = '') { }

	start(axiom: string) {
		this.axiom = axiom;
	}

	step(count: number = 1): string {
		let chrs = this.axiom.split('');
		for (let i = 0; i < count; i++) {
			chrs = chrs.flatMap(c => (this.rules[c] || c).split(''))
		}
		this.axiom = chrs.join('');
		return this.axiom;
	}
}
