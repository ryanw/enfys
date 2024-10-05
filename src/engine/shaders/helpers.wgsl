// Smoothstep that works the same on all platforms
fn ss(e0: f32, e1: f32, t: f32) -> f32 {
	let x = clamp((t - e0) / (e1 - e0), 0.0, 1.0);
	return x * x * (3 - 2 * x);
}

fn worldFromScreen(coord : vec2f, depth_sample: f32, mvp: mat4x4f) -> vec3f {
  // reconstruct world-space position from the screen coordinate.
  let posClip = vec4(coord.x * 2.0 - 1.0, (1.0 - coord.y) * 2.0 - 1.0, depth_sample, 1.0);
  let posWorldW = mvp * posClip;
  let posWorld = posWorldW.xyz / posWorldW.www;
  return posWorld;
}

fn translate(offset: vec3f) -> mat4x4f {
	return mat4x4f(
		1.0, 0.0, 0.0, 0.0,
		0.0, 1.0, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		offset.x, offset.y, offset.z, 1.0,
	);
}


fn identity() -> mat4x4f {
	return translate(vec3(0.0));
}
