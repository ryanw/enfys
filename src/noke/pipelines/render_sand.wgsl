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
var<storage, read> sandBuffer: array<u32>;

@group(0) @binding(4)
var<uniform> arena: Arena;

struct Arena {
	size: vec2f,
	time: f32,
}

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
	var color = vec4(1.0);
	// FIXME get size of buffer
	let coord = vec2u(in.uv * arena.size);
	let idx = coord.x + coord.y * u32(arena.size.x);
	let sand = sandBuffer[idx];

	switch sand {
		case 0u: {
			color = vec4(0.0);
		}
		// Sand
		case 1u: {
			color = sandColor(in.uv);
			break;
		}
		// Stone
		case 2u: {
			color = stoneColor(in.uv);
			break;
		}
		// Water
		case 3u: {
			color = waterColor(in.uv);
			break;
		}

		default: {
			color = vec4(1.0, 0.0, 0.0, 1.0);
		}
	}

	out.albedo = color;
	out.normal = vec4(0.0);
	out.metaOutput = 255u;
	return out;
}

fn sandColor(p: vec2f) -> vec4f {
	let c0 = hsl(0.2, 0.7, 0.7);
	let c1 = hsl(0.1, 0.3, 0.3);
	let t = fractalNoise(vec3(p * 192.0, 0.0), 4);
	return mix(c0, c1, t);
}

fn stoneColor(p: vec2f) -> vec4f {
	let c0 = hsl(0.2, 0.04, 0.4);
	let c1 = hsl(0.3, 0.02, 0.2);
	let t = fractalNoise(vec3(p * 192.0, 0.0), 4);
	return mix(c0, c1, t);
}

fn waterColor(p: vec2f) -> vec4f {
	let c0 = hsl(0.6, 0.5, 0.6);
	let c1 = hsl(0.5, 0.3, 0.5);
	let t = fractalNoise(vec3(p * 32.0, 0.0), 4);
	return mix(c0, c1, t);
}

@import "engine/shaders/helpers.wgsl";
@import "engine/shaders/color.wgsl";
@import "engine/shaders/noise.wgsl";

