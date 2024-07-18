@import "engine/shaders/noise.wgsl";

struct VertexIn {
	@builtin(vertex_index) id: u32,
	@location(0) position: vec3f,
	@location(1) normal: vec3f,
	@location(2) color: u32,
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
	color: vec4f,
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

	let offsetModel =  entity.model * translate(in.offset);
	var view = camera.view;
	// Remove translation
	view[3].x = 0.0;
	view[3].y = 0.0;
	view[3].z = 0.0;
	let mv = view * offsetModel;
	let mvp = camera.projection * mv;
	let p = (mv * vec4(in.position, 1.0));
	let scale = p.z / 1024.0;

	out.position = mvp * vec4(in.position * scale, 1.0);

	out.uv = in.position.xy * 0.5 + 0.5;


	let triangleId = in.id / 3;
	out.normal = (entity.model * vec4(normalize(in.normal), 0.0)).xyz;

	let modelPosition = offsetModel * vec4(in.position, 1.0);
	out.modelPosition = modelPosition.xyz / modelPosition.w;
	out.modelNormal = (mv * vec4(in.normal, 0.0)).xyz;

	out.color = uintToColor(in.color);
	out.triangleId = (rnd3uu(vec3(triangleId + entity.id))) % 0xff;

	return out;
}


@fragment
fn fs_main(in: VertexOut) -> FragmentOut {
	var out: FragmentOut;
	var color = material.color * in.color;
	out.albedo = color;

	out.normal = vec4(0.0);
	return out;
}

// From: https://iquilezles.org/articles/distfunctions2d/
fn sdPentagon(q: vec2f, r: f32) -> f32 {
	var p = q;
    let k = vec3(0.809016994,0.587785252,0.726542528);
    p.x = abs(p.x);
    p -= 2.0*min(dot(vec2(-k.x,k.y),p),0.0)*vec2(-k.x,k.y);
    p -= 2.0*min(dot(vec2( k.x,k.y),p),0.0)*vec2( k.x,k.y);
    p -= vec2(clamp(p.x,-r*k.z,r*k.z),r);    
    return length(p)*sign(p.y);
}

@import "engine/shaders/helpers.wgsl";
@import "engine/shaders/color.wgsl";
