/**
 * Compute shader to get the terrain height at a given point
 */

struct Uniforms {
	origin: vec2f,
	size: vec2f,
	seed: f32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var<storage, read_write> output: array<f32>;


@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
	let gid = globalId.xy;
	let size = vec2u(u.size);
	if gid.x >= size.x || gid.y >= size.y {
		return;
	}
	let o = vec3(u.origin.x, 0.0, u.origin.y);
	let p = o + vec3(f32(gid.x), 0.0, f32(gid.y));
	var idx = gid.x + gid.y * u32(size.x);
	// Flip Y
	//var idx = gid.x + (size.y - gid.y) * u32(size.x);
	output[idx] = landHeight(p, u.seed);
}

@import "./terrain_height.wgsl";
@import "engine/shaders/noise.wgsl";
