const BLEND_TO_ALPHA: bool = true;

struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
}

struct Uniforms {
	dither: i32,
	color: vec3f,
	t: f32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var colorSampler: sampler;

@group(0) @binding(2)
var positionTex: texture_2d<f32>;

@group(0) @binding(3)
var albedoTex: texture_2d<f32>;

@group(0) @binding(4)
var normalTex: texture_2d<f32>;

@group(0) @binding(5)
var depthTex: texture_2d<f32>;

const ditherMatrix = mat4x4(
	0.0000, 0.5000, 0.1250, 0.6250,
	0.7500, 0.2500, 0.8750, 0.3750,
	0.1875, 0.6875, 0.0625, 0.5625,
	0.9375, 0.4375, 0.8125, 0.3125
);

@vertex
fn vs_main(@builtin(vertex_index) i: u32) -> VertexOut {
	var out: VertexOut;

	let points = array<vec2f, 4>(
		vec2(-1.0, -1.0),
		vec2(1.0, -1.0),
		vec2(-1.0, 1.0),
		vec2(1.0, 1.0)
	);

	out.position = vec4(points[i], 0.0, 1.0);
	out.uv = points[i] * vec2(1.0, -1.0) * 0.5 + 0.5;

	return out;
}


@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
	let pixelSize = 2;

	let albedo = textureSample(albedoTex, colorSampler, in.uv);

	let posSize = vec2f(textureDimensions(positionTex));
	let posCoord = vec2u(posSize * in.uv);
	let pos = textureLoad(positionTex, posCoord, 0).xyz;

	let normalSize = vec2f(textureDimensions(normalTex));
	let normalCoord = vec2u(normalSize * in.uv);
	let normal = normalize(textureLoad(normalTex, normalCoord, 0).xyz);

	let depthSize = vec2f(textureDimensions(depthTex));
	let depthCoord = vec2u(depthSize * in.uv);
	let depth = 1.0 - textureLoad(depthTex, depthCoord, 0).r;

	var isEdge = false;
	var norms: array<vec3f, 4> = array<vec3f, 4>(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
	for (var y = 0u; y < 2u; y++) {
		for (var x = 0u; x < 2u; x++) {
			let i = x + y * 2u;
			let offset = vec2(i32(x), i32(y)) - 1;
			let coord = vec2i(normalSize * in.uv) + offset;
			let n = textureLoad(normalTex, coord, 0).xyz;
			norms[i] = n;
		}
	}

	if length(norms[0] - norms[1]) > 0.01 {
		isEdge = true;
	}
	if length(norms[2] - norms[3]) > 0.01 {
		isEdge = true;
	}
	if length(norms[1] - norms[3]) > 0.01 {
		isEdge = true;
	}
	if length(norms[0] - norms[2]) > 0.01 {
		isEdge = true;
	}

	let lightPos = vec3(sin(u.t) * 8.0, 2.0, -3.0);
	let lightDir = normalize(pos - lightPos);
	let shade = dot(normal, lightDir) * 0.5 + 0.5;


	let shadeLevels = 3.0;
	let div = f32(pixelSize);
	let ditherCoord = vec2(i32(in.position.x / div) % 4, i32(in.position.y / div) % 4);
	let ditherVal = ditherMatrix[ditherCoord.x][ditherCoord.y];

	var color = vec4(0.0);

	var brightness = 1.0;

	if u.dither > 0 {
		brightness = clamp(floor(shade * shadeLevels + ditherVal) / shadeLevels, 0.0, 1.0);
	}
	else {
		brightness = shade;
	}
	if BLEND_TO_ALPHA {
		color = albedo * pow(brightness, 2.2);
	}
	else {
		color = vec4(albedo.rgb * pow(brightness, 2.2), 1.0) * albedo.a;
	}

	if isEdge {
		color = vec4(1.0);
	}

	return color;
}
