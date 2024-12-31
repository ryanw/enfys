struct Vertex {
	position: array<f32, 3>,
	normal: array<f32, 3>,
	color: u32,
	alt: f32,
}

struct Uniforms {
	count: u32,
	seed: u32,
	seaLevel: f32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var<storage, read_write> vertices: array<Vertex>;


@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
	let idx = globalId.x;
	if idx >= u.count {
		return;
	}
	var vertex = vertices[idx];

	let scale = 1.0/3.0;
	var p = vec3(vertex.position[0], vertex.position[1], vertex.position[2]);
	p = terrainPoint(scale, p, 4, u.seed, u.seaLevel);
	vertex.position[0] = p.x;
	vertex.position[1] = p.y;
	vertex.position[2] = p.z;
	//vertex.alt = n0;
	vertices[idx] = vertex;
}

@import "./terrain_noise.wgsl";
@import "engine/shaders/noise.wgsl";
@import "engine/shaders/color.wgsl";
