fn uintToColor(u: u32) -> vec4f {
	let r = (u & 0x000000ffu) >> 0u;
	let g = (u & 0x0000ff00u) >> 8u;
	let b = (u & 0x00ff0000u) >> 16u;
	let a = (u & 0xff000000u) >> 24u;

	return vec4(
		f32(r) / 255.0,
		f32(g) / 255.0,
		f32(b) / 255.0,
		f32(a) / 255.0,
	);
}

fn colorToUint(color: vec4f) -> u32 {
	let r = u32(color.r * 255.0);
	let g = u32(color.g * 255.0);
	let b = u32(color.b * 255.0);
	let a = u32(color.a * 255.0);

	return (a << 24u) | (b << 16u) | (g << 8u) | r;
}

fn hslToRgb(color: vec3<f32>) -> vec4<f32> {
	return hsl(color.x, color.y, color.z);
}

fn hsl(h: f32, s: f32, l: f32) -> vec4<f32> {
	if s == 0.0 {
		return vec4<f32>(l, l, l, 1.0);
	}

	var q = 0.0;
	if l < 0.5 {
		q = l * (1.0 + s);
	} else {
		q = l + s - l * s;
	}
	let p = 2.0 * l - q;

	let r = hueToRGB(p, q, h + 1.0 / 3.0);
	let g = hueToRGB(p, q, h);
	let b = hueToRGB(p, q, h - 1.0 / 3.0);

	return vec4<f32>(r, g, b, 1.0);
}

fn rgbToHsl(color: vec3<f32>) -> vec3<f32> {
	var hsl = vec3(0.0);
	
	let fmin = min(min(color.r, color.g), color.b);
	let fmax = max(max(color.r, color.g), color.b);
	let delta = fmax - fmin;

	hsl.z = (fmax + fmin) / 2.0;

	if delta == 0.0	{
		hsl.x = 0.0;
		hsl.y = 0.0;
	}
	else {
		if hsl.z < 0.5{
		hsl.y = delta / (fmax + fmin);
	}
	else {
		hsl.y = delta / (2.0 - fmax - fmin);
	}
		
	let deltaR = (((fmax - color.r) / 6.0) + (delta / 2.0)) / delta;
	let deltaG = (((fmax - color.g) / 6.0) + (delta / 2.0)) / delta;
	let deltaB = (((fmax - color.b) / 6.0) + (delta / 2.0)) / delta;

		if (color.r == fmax ) {
			hsl.x = deltaB - deltaG;
		}
		else if (color.g == fmax) {
			hsl.x = (1.0 / 3.0) + deltaR - deltaB;
		}
		else if (color.b == fmax) {
			hsl.x = (2.0 / 3.0) + deltaG - deltaR;
		}

		if (hsl.x < 0.0) {
			hsl.x += 1.0;
		}
		else if (hsl.x > 1.0) {
			hsl.x -= 1.0;
		}
	}

	return hsl;
}

fn hueToRGB(p: f32, q: f32, ot: f32) -> f32 {
	var t = ot;
	if t < 0.0 {
		t += 1.0;
	}
	if t > 1.0 {
		t -= 1.0;
	}

	if t < 1.0 / 6.0 {
		return p + (q - p) * 6.0 * t;
	}

	if t < 1.0 / 2.0 {
		return q;
	}

	if t < 2.0 / 3.0 {
		return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
	}

	return p;
}
