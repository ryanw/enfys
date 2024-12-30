fn terrainNoise(p: vec3<f32>, octaves: i32, seed: u32, seaLevel: f32) -> f32 {
	var vseed = vec3(f32(seed)/100000.0);
	var n = fractalNoise(p/2.0 + vseed, octaves);
	if n > seaLevel {
		// Flatter beaches, pointier mountains
		n = seaLevel + pow((n - seaLevel)/(1.0-seaLevel), 2.0);
	}
	return n;
}
