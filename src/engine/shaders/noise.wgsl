const SALT: u32 = 0xDEADBEEFu;

// http://www.jcgt.org/published/0009/03/02/
fn pcg3d(v: vec3<u32>) -> vec3<u32> {
    var n = v * 1664525u + 1013904223u;

    n.x += n.y*n.z;
    n.y += n.z*n.x;
    n.z += n.x*n.y;

    n ^= n >> vec3<u32>(16u);

    n.x += n.y*n.z;
    n.y += n.z*n.x;
    n.z += n.x*n.y;

    return n;
}

fn smoothVec(v: vec3<f32>) -> vec3<f32> {
	return v * v * (3.0 - 2.0 * v);
}

fn rotr(x: u32, r: u32) -> u32 {
	return (x >> r) | (x << (32u - r));
}

fn rnd3u(useed: vec3<u32>) -> f32 {
	return f32(rnd3uu(useed)) / f32(0xffffffffu);
}

fn rnd3uu(useed: vec3<u32>) -> u32 {
	var seed = useed;
	seed.x = seed.x ^ rotr(SALT, 19u);
	seed.y = seed.y ^ rotr(SALT, 11u);
	seed.z = seed.z ^ rotr(SALT, 7u);
	return pcg3d(seed).x;
}

fn rnd3(seed: vec3<f32>) -> f32 {
	var useed = bitcast<vec3<u32>>(seed);
	return rnd3u(useed);
}

fn rnd2(seed: vec2<f32>) -> f32 {
	var useed = bitcast<vec2<u32>>(seed);
	return rnd3u(useed.xyy);
}

fn smoothNoise(v: vec3<f32>) -> f32 {
	var lv = smoothVec(fract(v));
	var id = floor(v);

	var bnl = rnd3(id + vec3<f32>(0.0, 0.0, 0.0));
	var bnr = rnd3(id + vec3<f32>(1.0, 0.0, 0.0));
	var bn = mix(bnl, bnr, lv.x);

	var bfl = rnd3(id + vec3<f32>(0.0, 0.0, 1.0));
	var bfr = rnd3(id + vec3<f32>(1.0, 0.0, 1.0));
	var bf = mix(bfl, bfr, lv.x);

	var b = mix(bn, bf, lv.z);

	var tnl = rnd3(id + vec3<f32>(0.0, 1.0, 0.0));
	var tnr = rnd3(id + vec3<f32>(1.0, 1.0, 0.0));
	var tn = mix(tnl, tnr, lv.x);

	var tfl = rnd3(id + vec3<f32>(0.0, 1.0, 1.0));
	var tfr = rnd3(id + vec3<f32>(1.0, 1.0, 1.0));
	var tf = mix(tfl, tfr, lv.x);

	var t = mix(tn, tf, lv.z);

	var c = mix(b, t, lv.y);

	return c;
}

fn fractalNoise(p: vec3<f32>, octaves: i32) -> f32 {
	var c = 0.0;
	var amp = 1.0;
	var total = 0.0;
	var freq = 4.0;
	for (var i: i32 = 0; i < octaves; i++) {
		c += smoothNoise(p * freq) * amp;
		total += amp;
		freq *= 3.0;
		amp /= 2.0;
	}
	c /= total;

	return c;
}
