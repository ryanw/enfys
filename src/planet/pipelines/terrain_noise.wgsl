const SEA_LEVEL = 0.5;

fn terrainNoise(p: vec3<f32>, octaves: i32, seed: u32) -> f32 {
	var vseed = vec3(f32(seed)/100000.0);
	var n = fractalNoise(p/2.0 + vseed, octaves);
	if n > SEA_LEVEL {
		// Flatter beaches, pointier mountains
		n = SEA_LEVEL + pow((n - SEA_LEVEL)/(1.0-SEA_LEVEL), 2.0);
	}
	return n;
}
