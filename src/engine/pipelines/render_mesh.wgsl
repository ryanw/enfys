struct Camera {
	view: mat4x4<f32>,
	projection: mat4x4<f32>,
	resolution: vec2<f32>,
	t: f32,
}

struct Entity {
	model: mat4x4<f32>,
}

struct VertexIn {
	@location(0) position: vec4f,
}

struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
}

@group(0) @binding(0)
var<uniform> camera: Camera;

@group(0) @binding(1)
var<uniform> entity: Entity;

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
	var out: VertexOut;

	let vp = camera.projection * camera.view;
	let mvp = vp * entity.model;
	out.position = mvp * in.position;
	//out.position = pv * in.position;
	out.uv = in.position.xy * 0.5 + 0.5;

	return out;
}


@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
	return vec4(in.uv, 0.0, 1.0);
}
