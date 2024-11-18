fn landHeight(op: vec3f, t: f32) -> f32 {
	let seed = vec3(313.0);
	let amp = 64.0;
	let freq = 1.0/256.0;
	let offset = 2.0;
	let roadWidth = 4.0;
	let octaves = 3;

	// Basic lumps
	var n = (fractalNoise(op * freq + seed, octaves)-0.5) * amp;

	// Flatten near the road
	var scale = 1.0;
	var minScale = 0.0;
	// Only flatten above sea level
	if n >= 0.0 {
		let roadOffset = roadPath(op.z);
		let flatRoad = pow(max(0.0, abs(op.x - roadOffset)-roadWidth) / 24.0, 2.0);
		scale = minScale + smoothstep(0.0, 1.0, flatRoad) * (1.0 - minScale);
	}
	n *= scale;
	n += offset;
	return n;
}

fn decorHeight(op: vec3f, t: f32) -> f32 {
	if abs(op.x) < 12.0 {
		// Don't spawn on road
		return -100.0;
	}
	return landHeight(op, t);
}

@import "./road_path.wgsl";
