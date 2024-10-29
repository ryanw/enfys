const BLEND_TO_ALPHA: bool = false;
const DRAW_SHADOWS: bool = true;
const DRAW_WATER: bool = true;
const DISTORT_WATER: vec2f = vec2(32.0, 0.3);
const DRAW_FOG: bool = true;
const EDGE_MODE: i32 = 3;
const DITHER_SHADOWS: bool = false;
const DEBUG_SHADOW_MAP: i32 = -1;

fn ditherPixel(p: vec2f, shade: f32, levels: i32) -> f32 {
 let shadeLevels = f32(levels);
 let div = f32(u.ditherSize);
 let ditherCoord = vec2(i32(p.x / div) % 4, i32(p.y / div) % 4);
 let ditherVal = ditherMatrix[ditherCoord.x][ditherCoord.y];
 return 1.0 - clamp(floor(shade * shadeLevels + ditherVal) / shadeLevels, 0.0, 1.0);
}


struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
}

struct Uniforms {
	invMvp: mat4x4f,
	light: vec4f,
	lightVp: array<mat4x4f, 8>,
	playerPosition: vec3f,
	lightCascadeCount: i32,
	waterColor: u32,
	ditherSize: i32,
	ditherDepth: i32,
	drawEdges: i32,
	drawShadows: i32,
	renderMode: i32,
	fog: f32,
	t: f32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var colorSampler: sampler;

@group(0) @binding(2)
var albedoTex: texture_2d<f32>;

@group(0) @binding(3)
var normalTex: texture_2d<f32>;

@group(0) @binding(4)
var depthTex: texture_2d<f32>;

@group(0) @binding(5)
var metaTex: texture_2d<u32>;

@group(0) @binding(6)
var shadowTex: texture_2d_array<f32>;

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
	var uv = in.uv;

	let depthSize = vec2f(textureDimensions(depthTex));
	let depthCoord = vec2u(depthSize * uv);
	let depth = textureLoad(depthTex, depthCoord, 0).r;
	let pos = worldFromScreen(uv, depth, u.invMvp);

	if DISTORT_WATER.x > 0.0 && pos.y < 0.0 {
		let n0 = (fractalNoise(pos/DISTORT_WATER.x + vec3(0.0, u.t / 10.0, 0.0), 3) - 0.5) / 10.0;
		let n1 = (fractalNoise(pos/DISTORT_WATER.x + vec3(0.0, u.t / 10.0, 0.0), 3) - 0.5) / 10.0;
		uv.x = uv.x + n0 * DISTORT_WATER.y;
		uv.y = uv.y + n1 * DISTORT_WATER.y;
	}

	var ripDepthCoord = vec2u(depthSize * uv);
	var ripDepth = textureLoad(depthTex, ripDepthCoord, 0).r;
	var ripPos = worldFromScreen(uv, ripDepth, u.invMvp);
	// Don't show objects outside of the water as shimmering inside
	if pos.y < 0.0 && ripPos.y >= 0.0 {
		uv = in.uv;
		ripDepth = depth;
		ripPos = pos;
	}

	let albedo = textureSample(albedoTex, colorSampler, uv);

	let normalSize = vec2f(textureDimensions(normalTex));
	let normalCoord = vec2u(normalSize * uv);
	let normal = normalize(textureLoad(normalTex, normalCoord, 0).xyz);



	let metaSize = vec2f(textureDimensions(metaTex));
	let metaCoord = vec2u(metaSize * uv);
	let metaVal = textureLoad(metaTex, metaCoord, 0).r;

	var isEdge = 0.0;

	if u.drawEdges > 0 {
		const et = 1.0 / 1500.0;


		if EDGE_MODE == 0 {
			var metas = array(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
			for (var y = 0u; y < 2u; y++) {
				for (var x = 0u; x < 2u; x++) {
					let i = x + y * 2u;
					let offset = vec2(i32(x), i32(y)) - 1;
					let coord = vec2i(normalSize * uv) + offset;
					let n = textureLoad(normalTex, coord, 0).xyz;
					metas[i] = n;
				}
			}

			if length(metas[0] - metas[1]) > et {
				//isEdge = 1.0;
			}
			if length(metas[2] - metas[3]) > et {
				isEdge = 1.0;
			}
			if length(metas[0] - metas[2]) > et {
				//isEdge = 1.0;
			}
			if length(metas[1] - metas[3]) > et {
				isEdge = 1.0;
			}

		} else if EDGE_MODE == 1 {
			let n0 = textureLoad(normalTex, normalCoord + vec2(0, 1), 0).xyz;
			let n1 = textureLoad(normalTex, normalCoord + vec2(1, 0), 0).xyz;
			let n2 = textureLoad(normalTex, normalCoord - vec2(0, 1), 0).xyz;
			let n3 = textureLoad(normalTex, normalCoord - vec2(1, 0), 0).xyz;
			let d0 = textureLoad(depthTex, depthCoord + vec2(0, 1), 0).r;
			let d1 = textureLoad(depthTex, depthCoord + vec2(1, 0), 0).r;
			let d2 = textureLoad(depthTex, depthCoord - vec2(0, 1), 0).r;
			let d3 = textureLoad(depthTex, depthCoord - vec2(1, 0), 0).r;
			if d0 <= depth && length(n0 - normal) > et {
				isEdge = 1.0;
			}
			if d1 <= depth && length(n1 - normal) > et {
				isEdge = 1.0;
			}
			if d2 <= depth && length(n2 - normal) > et {
				isEdge = 1.0;
			}
			if d3 <= depth && length(n3 - normal) > et {
				isEdge = 1.0;
			}
		}
		else if EDGE_MODE == 2 || (EDGE_MODE == 3 && uv.x < 0.5) {
			let n0 = textureLoad(metaTex, metaCoord + vec2(1, 0), 0).r;
			let n1 = textureLoad(metaTex, metaCoord - vec2(1, 0), 0).r;
			let n2 = textureLoad(metaTex, metaCoord + vec2(0, 1), 0).r;
			let n3 = textureLoad(metaTex, metaCoord - vec2(0, 1), 0).r;
			if n0 < metaVal || n1 < metaVal || n2 < metaVal || n3 < metaVal {
				isEdge = 1.0;
			}
		}
		else if EDGE_MODE == 3 {
			var offsets = array(
				vec2(-1, 0),
				vec2(1, 0),
				vec2(0, -1),
				vec2(0, 1),
			);
			for (var i = 0; i < 4; i++) {
				let off = offsets[i];
				let metaP = vec2i(metaCoord) + off;
				let n = textureLoad(metaTex, metaP, 0).r;
				if n < metaVal {
					isEdge = length(vec2f(off));
				}
			}
		}
	}

	var renderMode = u.renderMode;
	var color = vec4(0.0);
	var brightness = 1.0;
	var shade = 0.0;

	if length(normal) > 0.0 {
		//let lightPos = u.light.xyz;
		//let lightDir = normalize(pos - lightPos);
		let lightDir = u.light.xyz;
		shade = dot(normal, lightDir) * 0.5 + 0.5;
	}

	if DRAW_SHADOWS && u.drawShadows > 0 && renderMode == 0 {
		if DITHER_SHADOWS {
			var shadow = 0.0;
			if isInShadow(ripPos, normal) {
				shade += ditherPixel(in.position.xy, 0.5, 1);
			}
		} else {
			let sp = 0.03;
			let n = normal*0.02;
			let shadowSamples: array<bool, 5> = array(
				isInShadow(ripPos, normal),
				isInShadow(ripPos + vec3(sp, 0.0, 0.0), normal),
				isInShadow(ripPos + vec3(0.0, 0.0, sp), normal),
				isInShadow(ripPos - vec3(sp, 0.0, 0.0), normal),
				isInShadow(ripPos - vec3(0.0, 0.0, sp), normal),
			);

			var shadow = 0.0;
			for (var i = 0; i < 5; i++) {
				if (shadowSamples[i]) {
					shadow += 1.0;
				}
			}

			shade += shadow/5.0 / 2;
		}
	}

	if u.ditherSize > 0 {
		let shadeLevels = f32(u.ditherDepth);
		let div = f32(u.ditherSize);
		let ditherCoord = vec2(i32(in.position.x / div) % 4, i32(in.position.y / div) % 4);
		let ditherVal = ditherMatrix[ditherCoord.x][ditherCoord.y];
		brightness = 1.0 - clamp(floor(shade * shadeLevels + ditherVal) / shadeLevels, 0.0, 1.0);
	}
	else {
		brightness = 1.0 - shade;
	}

	if BLEND_TO_ALPHA {
		color = albedo * brightness;
	}
	else {
		color = vec4(albedo.rgb * brightness, 1.0) * albedo.a;
	}

	if renderMode == 1 {
		// GBuffer split view
		if uv.y < 0.5 {
			if uv.x < 0.5 {
				renderMode = 3;
			}
			else {
				renderMode = 4;
			}
		}
		else {
			if uv.x < 0.5 {
				renderMode = 6;
			}
			else {
				renderMode = 7;
			}
		}
	}

	// Draw water -- depth test to fix water behind fog
	if DRAW_WATER && depth < 1.0 && renderMode == 0 && pos.y < 20.0 {
		// Animate waves near edges
		let noiseScale = 0.03;
		let noiseOffset = vec3(u.t/37.0,u.t/24.0, u.t/47.0) * 20.0;
		let n0 = fractalNoise((vec3(pos.x, pos.y, pos.z) + noiseOffset) * noiseScale, 3) - 0.5;
		let y = (-pos.y + n0 * 2.0) / 128.0;
		if y > 0.0 {
			let waterDepth = ss(0.0, 1.5, pow(y, 0.4));
			//let waterDepth = ss(0.0, 1.5, pow((-pos.y + n0 * 2.0) / 128.0, 0.4));
			if waterDepth > 0.0 {
				var waterColor = uintToColor(u.waterColor);
				let foamColor = vec4(0.8, 0.9, 1.0, 1.0);
				let a = waterColor.a;
				waterColor.a = 1.0;
				color = mix(color, waterColor, clamp(waterDepth + a, 0.0, 1.0));

				// Foam near the edges
				let foamEdge = 1.0 / 50.0;
				if (waterDepth < foamEdge) {
					let foamFactor = 1.0 - waterDepth/foamEdge;
					color = mix(color, foamColor, clamp(foamFactor, 0.0, 1.0));
				}
			}
		}
	}


	var fogFactor = 0.0;
	if DRAW_FOG && u.fog > 0.0 {
		let fogHeight = 1000.0;
		let fogMin = 0.995 - (0.005 * (1.0 - u.fog));
		let fogMax = min(fogMin + 0.005, 1.0);
		let y = pos.y;
		let fogColor = vec4(0.7, 0.4, 0.8, 1.0);
		fogFactor = ss(0.0, 1.0, fogHeight/abs(y));
		fogFactor *= ss(fogMin, fogMax, depth);
		if color.a == 0.0 {
			let a = fogFactor;
			color = vec4(fogColor.rgb * a, a);
		}
		else {
			color = mix(color, fogColor, fogFactor);
		}
	}

	switch (renderMode) {
		// Shading
		case 2: {
			color = vec4(vec3(brightness), 1.0);
		}
		// Albedo
		case 3: {
			color = albedo;
		}
		// Normal
		case 4: {
			color = vec4(normal.xyz, 1.0);
		}
		// Position
		case 5: {
			color = vec4(pos.xyz / 100.0, 1.0);
		}
		// Depth
		case 6: {
			color = vec4(vec3((1.0-depth) * 128.0), 1.0);
		}
		// Meta
		case 7: {
			color = intToColor(metaVal);
		}
		// Fog
		case 8: {
			color = vec4(vec3(fogFactor), 1.0);
			return color;
		}
		default: {}
	}

	// Draw edges
	if isEdge == 0.0 {
	} else {
		// Fade out in distance
		//let ef = ss(1.0 / 100.0, 1.0 / 600.0, 1.0-depth);
		//color = mix(vec4(1.0), color, clamp(ef + 0.5, 0.0, 1.0));
		let m = ss(0.0, 1.0, isEdge) / 3.0;
		color = mix(vec4(0.0, 0.0, 0.0, 1.0), color, m);
		//color = vec4(vec3(1.0-isEdge/8.0), 1.0);
	}


	if DEBUG_SHADOW_MAP > -1 {
		color = drawShadowMap(uv, color, DEBUG_SHADOW_MAP);
	}

	return color;
}

fn isInShadow(p: vec3f, normal: vec3f) -> bool {
	for (var i = 0; i < u.lightCascadeCount; i++) {
		let n = normal * 0.07 * f32(i + 1);
		var d = depthInShadowCascade(p + n, i);
		if d < 0.0 {
			continue;
		}
		return d > 0.0;
	}
	return false;
}

fn depthInShadowCascade(p: vec3f, shadowLayer: i32) -> f32 {
	let shadowSize = vec2f(textureDimensions(shadowTex));
	let shadowPos = u.lightVp[shadowLayer] * vec4(p, 1.0);
	let suv = (shadowPos.xy/shadowPos.w) * 0.5 + 0.5;
	if suv.x < 0.0 || suv.x >= 1.0 || suv.y < 0.0 || suv.y >= 1.0 {
		return -1.0;
	}

	let coords = vec2u(vec2(suv.x, 1.0-suv.y) * shadowSize);
	let shadowDepth = textureLoad(shadowTex, coords, shadowLayer, 0).r;
	if shadowPos.z >= 1.0 {
		return -1.0;
	}
	if shadowPos.z > shadowDepth {
		return shadowPos.z - shadowDepth;
	}
	return 0.0;
}

fn isInShadowCascade(p: vec3f, shadowLayer: i32) -> bool {
	let shadowSize = vec2f(textureDimensions(shadowTex));
	let shadowPos = u.lightVp[shadowLayer] * vec4(p, 1.0);
	let suv = (shadowPos.xy/shadowPos.w) * 0.5 + 0.5;
	if suv.x < 0.0 || suv.x >= 1.0 || suv.y < 0.0 || suv.y >= 1.0 {
		return false;
	}
	

	let coords = vec2u(vec2(suv.x, 1.0-suv.y) * shadowSize);
	let shadowDepth = textureLoad(shadowTex, coords, shadowLayer, 0).r;
	if shadowPos.z < 1.0 && shadowPos.z > shadowDepth {
		return true;
	}
	return false;
}

fn drawShadowMap(uv: vec2f, color: vec4f, shadowLayer: i32) -> vec4f {
	let size = vec2(0.3);
	if uv.x > size.x || uv.y > size.y {
		return color;
	}
	let suv = vec2(uv.x / size.x, 1.0 - (uv.y / size.y));
	let shadowSize = vec2f(textureDimensions(shadowTex));
	let coords = vec2u(suv * shadowSize);
	let pixel = textureLoad(shadowTex, coords, shadowLayer, 0).rrr;
	let pos = worldFromScreen(suv, pixel.r, u.lightVp[shadowLayer]);
	return mix(vec4(suv, 0.0, 1.0), vec4(pixel, 1.0), 0.9);
}

fn intToColor(u: u32) -> vec4<f32> {
	let r = (u & 0x000000ffu) >> 0u;
	let g = (u & 0x0000ff00u) >> 8u;
	let b = (u & 0x00ff0000u) >> 16u;
	let a = (u & 0xff000000u) >> 24u;

	return vec4(
		f32(r) / 255.0,
		f32(g) / 255.0,
		f32(b) / 255.0,
		f32(a) / 255.0,
	);
}

@import "engine/shaders/helpers.wgsl";
@import "engine/shaders/noise.wgsl";
@import "engine/shaders/color.wgsl";
