fn roadPath(z: f32) -> vec2f {
	/*
	return vec2(
		cos(z/32.0) * 7.0,
		sin(z/32.0) * 13.0,
	);
	*/
	let n0 = fractalNoise(vec3(0.0, 0.0, z / 5120.0), 2) - 0.5;
	let n1 = fractalNoise(vec3(200.0, 100.0, z / 512.0), 1);
	return vec2(n0 * 512.0, pow(n1, 3.0) * 32.0);
}

fn roadTangent(z: f32) -> vec3f {
	let sampleSize = 0.5;
	let z0 = z - sampleSize;
	let z1 = z + sampleSize;
	let rp0 = roadPath(z0);
	let rp1 = roadPath(z1);
	let p0 = vec3(rp0, z0);
	let p1 = vec3(rp1, z1);
	return normalize(p0 - p1);
}
