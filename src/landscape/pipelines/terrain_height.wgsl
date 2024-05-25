var<private> continents_spline: array<f32, 10> = array<f32, 10>(1.0, 0.1, 0.11, 0.4, 0.42, 0.7, 0.8, 0.85, 0.9, 0.94);
var<private> erosion_spline: array<f32, 10>    = array<f32, 10>(1.0, 0.8, 0.6, 0.7, 0.3, 0.27, 0.5, 0.47, 0.2, 0.1);
var<private> valleys_spline: array<f32, 10>    = array<f32, 10>(0.0, 0.2, 0.4, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 0.85);

fn landHeight(op: vec3f, t: f32) -> f32 {
	var scale = 1024.0;
	var worldRadius = 10240.0;
	var startRadius = 128.0;

	var p = op.xz / scale;
	var np = vec3(p.x, t, p.y);
	var n = landscapeNoise(np);
	var cn = landscapeNoise(vec3(0.0, t, 0.0));

	var rad = length(op);

	// Drop into water at edges
	var d = clamp((rad - worldRadius) / worldRadius, 0.0, 1.0);
	n -= mix(0.0, 512.0, d);

	// Flatten near origin for player start
	d = clamp(pow(rad  / startRadius, 2.0), 0.0, 1.0);
	if cn <= 0.0 {
		// Underwater, add an island on the surface
		n = mix(1.0, n, d);
	} else {
		n = mix(cn + n * 0.2, n, d);
	}


	return n;
}

fn landscapeNoise(p: vec3f) -> f32 {
	var t0 = continents(p);
	var t1 = erosion(p);
	var t2 = valleys(p);
	return 0.2 + (t0 * t1 * t2) * 256.0;
}

fn spline(t: f32, s: array<f32, 10>) -> f32 {
	var idx = i32(floor(t * 10.0));
	if idx >= 9 {
		return s[9];
	}
	if idx < 0 {
		return s[0];
	}

	// Gah
	var n0 = 0.0;
	var n1 = 0.0;
	switch idx {
		case 0: {
			n0 = s[0];
			n1 = s[1];
		}
		case 1: {
			n0 = s[1];
			n1 = s[2];
		}
		case 2: {
			n0 = s[2];
			n1 = s[3];
		}
		case 3: {
			n0 = s[3];
			n1 = s[4];
		}
		case 4: {
			n0 = s[4];
			n1 = s[5];
		}
		case 5: {
			n0 = s[5];
			n1 = s[6];
		}
		case 6: {
			n0 = s[6];
			n1 = s[7];
		}
		case 7: {
			n0 = s[7];
			n1 = s[8];
		}
		case 8: {
			n0 = s[8];
			n1 = s[9];
		}
		default: {
		}
	}

	var d = fract(t * 10.0);
	return mix(n0, n1, d) * 2.0 - 1.0;
}

fn continents(p: vec3<f32>) -> f32 {
	var o = vec3(1000.0);
	var t = fractalNoise((p + o) / 2.0, 3);
	return spline(t, continents_spline);
}

fn erosion(p: vec3<f32>) -> f32 {
	var o = vec3(1500.0);
	var t = fractalNoise((p + o) / 4.0, 2);
	return 0.5 + spline(t, erosion_spline) * 0.5;
}

fn valleys(p: vec3<f32>) -> f32 {
	var o = vec3(3000.0);
	var t = fractalNoise((p + o) * 3.0, 4);
	return spline(t, valleys_spline);
}


@import "engine/shaders/noise.wgsl";
