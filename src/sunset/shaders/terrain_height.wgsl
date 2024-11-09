fn landHeight(op: vec3f, t: f32) -> f32 {
	let seed = vec3(313.0);
	let amp = 64.0;
	let freq = 1.0/256.0;
	let offset = 2.0;
	let roadWidth = 3.5;
	let octaves = 3;
	var n = (fractalNoise(op * freq + seed, octaves)-0.5) * amp;
	var scale = 1.0;
	if n >= 0.0 {
		scale = smoothstep(0.0, 1.0, pow(max(0.0, abs(op.x)-roadWidth) / 24.0, 2.0));
	}
	n *= scale;
	n += offset;
	return n;
}
