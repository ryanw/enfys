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
	var p = (vec3(f32(globalId.x), 0.0, f32(globalId.y)) - vec3(128.0, 0.0, 128.0)) * 8.0;
	p.y = landHeight(p, u.seed);

	var n = rnd3(p);


	if p.y > 0.4 && p.y < 9.0 && n < 1.0 / 1.0 {
		var n0 = (rnd3(p + vec3(123.0)) - 0.5) * 32.0;
		var n1 = (rnd3(p + vec3(323.0)) - 0.5) * 32.0;
		var instance: Instance;
		p.x += n0;
		p.z += n1;
		p.y = landHeight(p, u.seed);
		// Gap around player start
		if length(p.xz) < 8.0 {
			return;
		}
		instance.offset = array(p.x, p.y, p.z);
		let count = atomicAdd(&counter, 1u);
		if (count < 512000) {
			instances[count] = instance;
		}
	}
}

@import "./terrain_height.wgsl";
