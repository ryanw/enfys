struct VertexIn {
	@location(0) position: vec3f,
	@location(1) normal: vec3f,
	@location(2) uv: vec2f,
}

struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
	@location(1) normal: vec3f,
	@location(2) modelPosition: vec3f,
	@location(3) modelNormal: vec3f,
}

struct FragmentOut {
	@location(0) position: vec4f,
	@location(1) albedo: vec4f,
	@location(2) normal: vec4f,
}

struct Camera {
	view: mat4x4<f32>,
	projection: mat4x4<f32>,
	resolution: vec2<f32>,
	t: f32,
}

struct Entity {
	model: mat4x4<f32>,
}


@group(0) @binding(0)
var<uniform> camera: Camera;

@group(0) @binding(1)
var<uniform> entity: Entity;

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
	var out: VertexOut;

	let mv = camera.view * entity.model;
	let mvp = camera.projection * mv;
	out.position = mvp * vec4(in.position, 1.0);
	out.uv = in.position.xy * 0.5 + 0.5;
	out.normal = (entity.model * vec4(in.normal, 0.0)).xyz;
	let modelPosition = mv * vec4(in.position, 1.0);
	out.modelPosition = modelPosition.xyz / modelPosition.w;
	out.modelNormal = (mv * vec4(in.normal, 0.0)).xyz;

	return out;
}


@fragment
fn fs_main(in: VertexOut) -> FragmentOut {
	var out: FragmentOut;

	var lightDir = normalize(vec3(-0.3, -0.1, 0.6));
	var color = vec4(0.8, 0.2, 0.4, 1.0);
	var shade = dot(lightDir, in.normal);

	out.albedo =  color;
	out.position = vec4(in.modelPosition, 1.0);
	out.normal = vec4(in.modelNormal, 0.0);
	//out.color = vec4(in.normal, color.a);

	return out;
}
