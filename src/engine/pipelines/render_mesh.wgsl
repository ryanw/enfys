@import "engine/shaders/noise.wgsl";

struct VertexIn {
	@builtin(vertex_index) id: u32,
	@location(0) position: vec3f,
	@location(1) normal: vec3f,
	@location(2) color: vec4f,
	// Instance
	@location(3) offset: vec3f,
}

struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
	@location(1) normal: vec3f,
	@location(2) color: vec4f,
	@location(3) modelPosition: vec3f,
	@location(4) modelNormal: vec3f,
	@location(5) @interpolate(flat) triangleId: u32,
}

struct Fragment1Out {
	@location(0) albedo: vec4f,
	@location(1) normal: vec4f,
	@location(2) metaOutput: u32,
}

struct Fragment2Out {
	@location(0) metaOutput: u32,
}

struct Camera {
	view: mat4x4f,
	projection: mat4x4f,
	resolution: vec2f,
	t: f32,
}

struct Entity {
	model: mat4x4f,
	id: u32,
}

struct Material {
	color: vec4f,
	dither: u32,
}


@group(0) @binding(0)
var<uniform> camera: Camera;

@group(0) @binding(1)
var<uniform> entity: Entity;

@group(0) @binding(2)
var<uniform> material: Material;

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
	var out: VertexOut;

	let mv = camera.view * translate(in.offset) * entity.model;
	let mvp = camera.projection * mv;
	out.position = mvp * vec4(in.position, 1.0);
	out.uv = in.position.xy * 0.5 + 0.5;


	let triangleId = in.id / 3;
	out.normal = (entity.model * vec4(normalize(in.normal), 0.0)).xyz;

	let modelPosition = entity.model * vec4(in.position, 1.0);
	out.modelPosition = modelPosition.xyz / modelPosition.w;
	out.modelNormal = (mv * vec4(in.normal, 0.0)).xyz;

	out.color = in.color;
	out.triangleId = (rnd3uu(vec3(triangleId + entity.id))) % 0xff;

	return out;
}


@fragment
fn fs_main(in: VertexOut) -> Fragment1Out {
	var out: Fragment1Out;
	var color = material.color * in.color;

	var lightDir = normalize(vec3(-0.3, -0.1, 0.6));
	var shade = dot(lightDir, in.normal);

	out.albedo =  color;

	out.normal = vec4(in.normal, 0.0);
	out.metaOutput = in.triangleId;
	return out;
}

@import "engine/shaders/helpers.wgsl";
