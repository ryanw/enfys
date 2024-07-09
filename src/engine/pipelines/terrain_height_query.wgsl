/**
 * Compute shader to get the terrain height at a given point
 */

struct Uniforms {
	point: vec3f,
	seed: f32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var<storage, read_write> point: vec3f;


@compute @workgroup_size(1)
fn main() {
	let p = u.point;
	point = vec3(
		p.x,
		landHeight(p, u.seed),
		p.z,
	);
}

@import "./terrain_height.wgsl";
