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

struct Material {
	faceColor: u32,
	wireColor: u32,
	shape: u32,
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
	out.originalPosition = p.xyz / p.w;
	out.uv = v.position.xy * 0.5 + 0.5;
	out.normal = (offsetModel * vec4(normalize(v.normal), 0.0)).xyz;
	out.barycentric = barycentrics[in.id % 3u];
	out.triangleId = in.id / 3u;
	out.quadId = in.id / 4u;

	let faceColor = uintToColor(material.faceColor);
	let vertexColor = uintToColor(v.color);
	let instanceColor = uintToColor(in.instanceColor);
	if vertexColor.r == 1.0 && vertexColor.g == 1.0 && vertexColor.b == 1.0 && vertexColor.a == 1.0 {
		out.color = instanceColor * faceColor;
	}
	else {
		out.color = vertexColor * faceColor;
	}

	return out;
}


@fragment
fn fs_main(in: VertexOut) -> FragmentOut {
	var out: FragmentOut;
	var color = in.color;
	var brightness = 1.0;
	if color.a == 0.0 {
		discard;
	}
	let bar = in.barycentric;
	var minEdge = min(bar.x, bar.z);
	if material.shape == 0u {
		minEdge = min(minEdge, bar.y);
	}
	let der = sqrt(pow(dpdx(minEdge), 2.0) + pow(dpdy(minEdge), 2.0));
	let pixEdge = minEdge / der;
	let thickness = 1.5;

	// Draw animated pulse
	let t = abs((camera.t/8.0 + 20.2) - in.originalPosition.z / 5120.0);
	let baseColor = rgbToHsl(uintToColor(material.wireColor).rgb);
	let pulseColor = vec3(baseColor.x, baseColor.y, min(1.0, baseColor.z + 0.5));
	let wireColor = mix(
		hslToRgb(baseColor),
		hslToRgb(pulseColor),
		smoothstep(0.99, 1.0, 1.0-(t % 1.0))
	);

	var normal = vec4(in.normal, 0.0);
	if pixEdge < thickness {
		let e = 1.0 - smoothstep(max(0.0, thickness-2.0), thickness, pixEdge);
		color = mix(color, wireColor, e);
		normal = vec4(0.0);
	}

	// Mip level to cleanup moire patterns
	let dx = length(dpdx(bar));
	let dy = length(dpdy(bar));
	let mip = smoothstep(-2.0, -0.0, log2(max(dx, dy)));
	if mip > 0.0 {
		color = mix(color, mix(in.color, wireColor, mip/2.0), mip);
		normal = vec4(0.0);
	}


	out.albedo = vec4(color.rgb * brightness, color.a);
	out.normal = normal;
	out.metaOutput = in.triangleId % 0xff;



	return out;
}

const PI: f32 = 3.14159265;
fn pointToLonLat(point: vec3<f32>) -> vec2<f32> {
	let v = normalize(point);
	let lat = acos(v.y) - PI / 2.0;
	let lon = atan2(v.z, v.x) + PI / 2.0;
	return vec2(lon, lat);
}

fn lonLatToUV(ll: vec2<f32>) -> vec2<f32> {
	let x = ll.x / PI / 2.0;
	let y = ll.y / PI + 0.5;
	return vec2(fract(x), fract(y));
}

fn pointToUV(point: vec3<f32>) -> vec2<f32> {
	return lonLatToUV(pointToLonLat(point));
}

fn terrainNoise(p: vec3<f32>, octaves: i32) -> f32 {
	var n = fractalNoise(p, octaves);
	if n > SEA_LEVEL {
		// Flatter beaches, pointier mountains
		n = SEA_LEVEL + pow((n - SEA_LEVEL)/(1.0-SEA_LEVEL), 2.0);
	}
	return n;
}

@import "engine/shaders/noise.wgsl";
@import "engine/shaders/color.wgsl";
