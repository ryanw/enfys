struct VertexIn {
	@location(0) position: vec4f,
}

struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
}

struct Uniforms {
	t: f32
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
	var out: VertexOut;

	out.position = in.position;
	out.uv = in.position.xy * 0.5 + 0.5;

	return out;
}


@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
	return vec4(in.uv, 0.4, 1.0);
}
