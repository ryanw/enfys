struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
}

struct Uniforms {
	t: f32
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
	out.uv = points[i] * 0.5 + 0.5;

	return out;
}


@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
	let albedo = textureSample(albedoTex, colorSampler, in.uv);

	let posSize = vec2f(textureDimensions(positionTex));
	let posCoord = vec2u(posSize * in.uv);
	let pos = textureLoad(positionTex, posCoord, 0).xyz;

	let normalSize = vec2f(textureDimensions(normalTex));
	let normalCoord = vec2u(normalSize * in.uv);
	let normal = textureLoad(normalTex, normalCoord, 0).xyz;

	let depthSize = vec2f(textureDimensions(depthTex));
	let depthCoord = vec2u(depthSize * in.uv);
	let depth = 1.0 - textureLoad(depthTex, depthCoord, 0).r;

	let lightPos = vec3(sin(u.t) * 8.0, 2.0, -3.0);
	let lightDir = normalize(pos - lightPos);
	let shade = dot(normal, lightDir);
	let brightness = 0.5 + shade;
	var color = vec4(albedo.rgb * brightness, 1.0) * albedo;

	if color.a == 0.0 {
		discard;
	}

	return color;
}
