export function getParam(name: string): string | undefined {
	return window.location.search.match(new RegExp(`(?:\\?|&)${name}=([^&]+)`))?.[1];
}

export function smoothstep(l: number, r: number, t: number): number {
	const { min, max } = Math;
	const x = max(0, min(1, (t - l) / (r - l)));
	return x * x * (3 - 2 * x);
}
