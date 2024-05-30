declare module '*.wgsl' {
	const source: string;
	export default source;
}

declare module '*.html' {
	const source: string;
	export default source;
}

interface Element {
    requestPointerLock(options: { unadjustMovement?: bool }): void;
}
