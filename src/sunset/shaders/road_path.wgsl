fn roadPath(z: f32) -> f32 {
	//return sin(z/64.0) * 64.0;
	let n0 = fractalNoise(vec3(0.0, 0.0, z / 2560.0), 3) - 0.5;
	return n0 * 512.0;
}

fn roadNormal(z: f32) -> vec3f {
	let sampleSize = 1.0;
	let z0 = z - sampleSize;
	let z1 = z + sampleSize;
	let x0 = roadPath(z0);
	let x1 = roadPath(z1);
	let p0 = vec2(x0, z0);
	let p1 = vec2(x1, z1);
	let tangent = normalize(p0 - p1);
	let normal = vec2(-tangent.y, tangent.x);
	return vec3(normal.x, 0.0, normal.y);
}
fn roadTangent(z: f32) -> vec2f {
	let sampleSize = 0.5;
	let z0 = z - sampleSize;
	let z1 = z + sampleSize;
	let x0 = roadPath(z0);
	let x1 = roadPath(z1);
	let p0 = vec2(x0, z0);
	let p1 = vec2(x1, z1);
	return normalize(p0 - p1);
}
