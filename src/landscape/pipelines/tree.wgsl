struct Instance {
	// array instead of vec to avoid alignment issues
	offset: array<f32, 3>,
}

struct Uniforms {
	position: vec3f,
	radius: f32,
	density: f32,
	seed: f32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var<storage, read_write> counter: atomic<u32>;

@group(0) @binding(2)
var<storage, read_write> instances: array<Instance>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
	var p = vec3(f32(globalId.x), 0.0, f32(globalId.y)) * 1.0;
	p.y = landHeight(p, u.seed);

	var n = rnd3(p);

	if n < 1.0 / 5.0 {
		var instance: Instance;
		let count = atomicAdd(&counter, 1u);
		instance.offset = array(p.x, p.y, p.z);
		if (count < 512000) {
			instances[count] = instance;
		}
	}
}

@import "./terrain_height.wgsl";
