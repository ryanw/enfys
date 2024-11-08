struct PackedVertex {
	position: array<f32, 3>,
	normal: array<f32, 3>,
	color: u32,
	softness: f32,
}

struct Vertex {
	position: vec3f,
	normal: vec3f,
	color: u32,
	softness: f32,
}

struct Material {
	hazeColor: u32,
}

struct VertexIn {
	@builtin(vertex_index) id: u32,
	@builtin(instance_index) instance: u32,
	// Instance
	@location(3) transform0: vec4f,
	@location(4) transform1: vec4f,
	@location(5) transform2: vec4f,
	@location(6) transform3: vec4f,
	@location(7) instanceColor: u32,
	@location(8) variantIndex: u32,
	@location(9) live: u32,
}

struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
	@location(1) normal: vec3f,
	@location(2) color: vec4f,
	@location(3) originalPosition: vec3f,
	@location(4) modelPosition: vec3f,
	@location(5) modelNormal: vec3f,
	@location(6) barycentric: vec3f,
	@location(8) @interpolate(flat) triangleId: u32,
	@location(9) @interpolate(flat) quadId: u32,
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
	isShadowMap: u32,
}

struct Pawn {
	model: mat4x4f,
	id: u32,
	vertexCount: u32,
	variantCount: u32,
	variantIndex: u32,
}

struct Shadow {
	position: vec3f,
	radius: f32,
	umbra: f32,
	shape: u32,
	color: u32,
}


@group(0) @binding(0)
var<uniform> camera: Camera;

@group(0) @binding(1)
var<uniform> pawn: Pawn;

@group(0) @binding(2)
var<uniform> material: Material;

@group(0) @binding(3)
var<storage, read> vertices: array<PackedVertex>;

const SEA_LEVEL = 0.55;
const PI: f32 = 3.14159265;
const PIH: f32 = PI/2.0;

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
	var out: VertexOut;
	if (in.live == 0u) {
		out.position = vec4(100.0, 100.0, 100.0, 1.0);
		return out;
	}

	let barycentrics = array<vec3f, 3>(
		vec3(1.0, 0.0, 0.0),
		vec3(0.0, 1.0, 0.0),
		vec3(0.0, 0.0, 1.0),
	);

	let variantIndex = in.variantIndex + pawn.variantIndex;
	let vertexOffset = (variantIndex % pawn.variantCount) * pawn.vertexCount;
	let idx = in.id + vertexOffset;
	let packedVertex = vertices[idx];

	let v = Vertex(
		vec3(packedVertex.position[0], packedVertex.position[1], packedVertex.position[2]),
		vec3(packedVertex.normal[0], packedVertex.normal[1], packedVertex.normal[2]),
		packedVertex.color,
		packedVertex.softness,
	);

	var vp = normalize(v.position);
	let scale = 1.0/8.0;

	let transform = mat4x4(
		in.transform0,
		in.transform1,
		in.transform2,
		in.transform3
	);
	let offsetModel = pawn.model * transform;
	let mv = camera.view * offsetModel;
	let mvp = camera.projection * camera.view;
	var p = offsetModel * vec4(v.position, 1.0);
	var position = mvp * p;

	out.position = position;
	out.uv = v.position.xy * 0.5 + 0.5;
	out.originalPosition = v.position;
	out.color = vec4(1.0);
	out.barycentric = barycentrics[in.id % 3u];
	out.triangleId = in.id / 3u;
	out.quadId = in.id / 4u;

	return out;
}


@fragment
fn fs_main(in: VertexOut) -> FragmentOut {
	var out: FragmentOut;
	var color = in.color;
	if color.a == 0.0 {
		discard;
	}
	let hazeColor = uintToColor(material.hazeColor);

	let bar = in.barycentric;
	let minEdge = min(bar.x, min(bar.y, bar.z));
	let der = sqrt(pow(dpdx(minEdge), 2.0) + pow(dpdy(minEdge), 2.0));
	let pixEdge = minEdge / der;
	let thickness = 1.2;


	var p = normalize(in.originalPosition);
	let ll = pointToLonLat(p);


	// Haze over the sun
	var y = p.y * 5.0;
	let freq = 8.0;
	let amp = 0.6;
	let hazeOffset = vec2(PIH, 0.0);
	var x = (ss(-PI, PI, p.x * freq) - 0.5) * PI;
	if p.z < 0.0 {
		x = PIH;
	}
	y += sin(x - hazeOffset.x) * amp + hazeOffset.y;
	var haze = 1.0 - ss(0.1, 0.5, y);


	// Clear sky
	let star = pow(ss(0.93, 1.0, length(bar)), 3.0);
	let skyColor = vec4(vec3(star), star);

	// Wire
	if pixEdge < thickness {
		let e = 1.0 - smoothstep(max(0.0, thickness-2.0), thickness, pixEdge) - star;
		haze = clamp(haze, e, 1.0);
	}

	color = mix(skyColor, hazeColor, haze);


	out.albedo = vec4(color.rgb / color.a, color.a);
	out.metaOutput = in.triangleId % 0xff;

	return out;
}

fn pointToLonLat(point: vec3<f32>) -> vec2<f32> {
	let v = normalize(point);
	let lat = acos(v.y) - PIH;
	let lon = atan2(v.z, v.x) + PIH;
	return vec2(lon, lat);
}

fn lonLatToUV(ll: vec2<f32>) -> vec2<f32> {
	let x = ll.x / PIH;
	let y = ll.y / PI + 0.5;
	return vec2(fract(x), fract(y));
}

fn pointToUV(point: vec3<f32>) -> vec2<f32> {
	return lonLatToUV(pointToLonLat(point));
}

@import "engine/shaders/noise.wgsl";
@import "engine/shaders/color.wgsl";
@import "engine/shaders/helpers.wgsl";
