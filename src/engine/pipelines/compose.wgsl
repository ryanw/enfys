struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
}

struct Uniforms {
	t: f32
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var colorSampler: sampler;

@group(0) @binding(2)
var albedo: texture_2d<f32>;

@vertex
fn vs_main(@builtin(vertex_index) i: u32) -> VertexOut {
	var out: VertexOut;

	let points = array<vec2f, 4>(
		vec2(-1.0, -1.0),
		vec2(1.0, -1.0),
		vec2(-1.0, 1.0),
		vec2(1.0, 1.0)
	);

	out.position = vec4(points[i], 0.0, 1.0);
	out.uv = points[i] * 0.5 + 0.5;

	return out;
}


@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
	let coord = vec2<u32>(in.position.xy);
	var albedo = textureSample(albedo, colorSampler, in.uv);
	return albedo;
}
