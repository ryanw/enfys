struct Uniforms {
	z: f32,
}

struct Result {
	tangent: vec3f,
	offset: vec2f,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var<storage, read_write> result: Result;

@compute @workgroup_size(1)
fn main() {
	result.tangent = roadTangent(u.z);
	result.offset = roadPath(u.z);
}

@import "../shaders/road_path.wgsl";
@import "engine/shaders/noise.wgsl";
