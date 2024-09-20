struct VertexIn {
	@location(0) position: vec3f,
	@location(1) uv: vec2f,
	// Instance
	@location(2) region: vec4f,
	@location(3) translation: vec2f,
	@location(4) rotation: vec2f,
}

struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
}

struct FragmentOut {
	@location(0) albedo: vec4f,
	@location(1) normal: vec4f,
	@location(2) metaOutput: u32,
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
	tint: vec4f,
}

@group(0) @binding(0)
var<uniform> camera: Camera;

@group(0) @binding(1)
var<uniform> entity: Entity;

@group(0) @binding(2)
var<uniform> material: Material;

@group(0) @binding(3)
var spriteSampler: sampler;

@group(0) @binding(4)
var spriteTex: texture_2d<f32>;

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
	var out: VertexOut;

	let offsetModel =  entity.model * translate(in.position + vec3(0.5));
	var view = camera.view;
	let mv = view * offsetModel;
	let mvp = camera.projection * mv;
	let p = (mv * vec4(in.position, 1.0));

	out.position = mvp * vec4(in.position, 1.0);
	out.uv = in.uv;

	return out;
}


@fragment
fn fs_main(in: VertexOut) -> FragmentOut {
	var out: FragmentOut;
	var color = material.tint;

	color *= textureSample(spriteTex, spriteSampler, in.uv);

	out.albedo = color;
	out.normal = vec4(0.0);
	out.metaOutput = 255u;
	return out;
}

@import "engine/shaders/helpers.wgsl";
@import "engine/shaders/color.wgsl";
@import "engine/shaders/noise.wgsl";

