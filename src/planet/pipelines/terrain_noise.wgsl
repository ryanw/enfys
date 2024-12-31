fn terrainNoise(p: vec3<f32>, octaves: i32, seed: u32, seaLevel: f32) -> f32 {
	var vseed = vec3(f32(seed)/1000000.0);
	var n = fractalNoise(p/2.0 + vseed, octaves);
	if n > seaLevel {
		// Flatter beaches, pointier mountains
		n = seaLevel + pow((n - seaLevel)/(1.0-seaLevel), 2.0);
	}
	return n;
}

fn terrainPoint(scale: f32, p: vec3<f32>, octaves: i32, seed: u32, seaLevel: f32) -> vec3f {
	let vp = normalize(p);
	let n0 = terrainNoise(p / 2.0, octaves, seed, seaLevel);
	return p + vp * (max(seaLevel, n0) * scale - scale/2.0);
}

fn terrainNormal(scale: f32, p: vec3<f32>, octaves: i32, seed: u32, seaLevel: f32) -> vec3f {
	let d = 0.0001;
	let v = normalize(p);

	var arbitrary =  vec3(0.0, 0.0, 1.0);
	if v.x == 0.0 && v.y == 0.0 {
		arbitrary = vec3(1.0, 0.0, 0.0);
	}

	let u = normalize(cross(v, arbitrary));
	let w = cross(v, u);
	
	let pp0 = p + u * d;
	let pp1 = p + w * d;
	let pp2 = p + (u + w) * d;

	let p0 = terrainPoint(scale, pp0, octaves, seed, seaLevel);
	let p1 = terrainPoint(scale, pp1, octaves, seed, seaLevel);
	let p2 = terrainPoint(scale, pp2, octaves, seed, seaLevel);

	var v0 = p1 - p0;
	var v1 = p2 - p0;
	return normalize(cross(v0, v1));
}
