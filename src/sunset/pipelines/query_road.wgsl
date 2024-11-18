struct Uniforms {
	z: f32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var<storage, read_write> result: vec3f;

@compute @workgroup_size(1)
fn main() {
	let roadTan = roadTangent(u.z);
	let offset = roadPath(u.z);
	result = vec3(roadTan, offset);
	
}

@import "../shaders/road_path.wgsl";
@import "engine/shaders/noise.wgsl";
