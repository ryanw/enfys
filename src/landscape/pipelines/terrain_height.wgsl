fn landHeight(op: vec3f, t: f32) -> f32 {
	let scale = 1024.0;
	let worldRadius = 3072.0;
	var p = op.xz / scale;
	let np = vec3(p.x, t, p.y);
	var n = landscapeNoise(np);

	let rad = length(op);

	// Drop into water at edges
	let d = clamp((rad - worldRadius) / worldRadius, 0.0, 1.0);
	n -= mix(0.0, 128.0, d);

	return n;
}
