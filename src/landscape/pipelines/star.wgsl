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
	let id = vec3f(globalId);
	let n = rnd3(id);

	if n < 1.0 / 10.0 {
		var n0 = (rnd3(id + vec3(123.0)) - 0.5);
		var n1 = (rnd3(id + vec3(323.0)) - 0.5);
		var n2 = (rnd3(id + vec3(555.0)) - 0.5);
		var p = normalize(vec3(n0, n1, n2)) * 17000.0;
		var instance: Instance;
		instance.offset = array(p.x, p.y, p.z);
		let count = atomicAdd(&counter, 1u);
		if (count < 512000) {
			instances[count] = instance;
		}
	}
}

@import "engine/shaders/noise.wgsl";
