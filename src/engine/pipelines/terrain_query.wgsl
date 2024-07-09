/**
 * Compute shader to get the terrain height at a given point
 */

struct Uniforms {
	mvp: mat4x4f,
	uv: vec2f,
	seed: f32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var depthTex: texture_2d<f32>;

@group(0) @binding(2)
var<storage, read_write> point: vec3f;


@compute @workgroup_size(1)
fn main() {
	let depthSize = vec2f(textureDimensions(depthTex));
	let depthCoord = vec2u(depthSize * u.uv);
	let depth = textureLoad(depthTex, depthCoord, 0).r;
	let p = worldFromScreen(u.uv, depth, u.mvp);
	point = vec3(
		p.x,
		landHeight(p, u.seed),
		p.z,
	);
}

@import "./terrain_height.wgsl";
@import "engine/shaders/helpers.wgsl";
