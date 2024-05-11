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
	@location(0) position: vec3f,
	@location(1) normal: vec3f,
	@location(2) uv: vec2f,
}

struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
	@location(1) normal: vec3f,
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
	out.position = mvp * vec4(in.position, 1.0);
	out.uv = in.position.xy * 0.5 + 0.5;
	out.normal = (entity.model * vec4(in.normal, 0.0)).xyz;

	return out;
}


@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
	var lightDir = normalize(vec3(-0.3, -0.1, 0.6));
	var color = vec4(0.3, 0.8, 0.1, 1.0);
	var shade = dot(lightDir, in.normal);
	return vec4(color.rgb * shade, color.a);
}
