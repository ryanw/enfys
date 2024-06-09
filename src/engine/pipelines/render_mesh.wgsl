@import "engine/shaders/noise.wgsl";

struct VertexIn {
	@builtin(vertex_index) id: u32,
	@location(0) position: vec3f,
	@location(1) normal: vec3f,
	@location(2) color: u32,
	// Instance
	@location(3) offset: vec3f,
	@location(4) instanceColor: u32,
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
	color: u32,
	dither: u32,
	emissive: u32,
	receiveShadows: u32,
}

struct Shadow {
	position: vec3f,
	radius: f32,
	umbra: f32,
	shape: u32,
	color: u32,
}

const ditherMatrix = mat4x4(
	0.0000, 0.5000, 0.1250, 0.6250,
	0.7500, 0.2500, 0.8750, 0.3750,
	0.1875, 0.6875, 0.0625, 0.5625,
	0.9375, 0.4375, 0.8125, 0.3125
);


@group(0) @binding(0)
var<uniform> camera: Camera;

@group(0) @binding(1)
var<uniform> entity: Entity;

@group(0) @binding(2)
var<uniform> material: Material;

@group(0) @binding(3)
var<storage> shadows: array<Shadow>;

@vertex
fn vs_main(in: VertexIn) -> VertexOut {
	var out: VertexOut;

	let offsetModel = translate(in.offset) * entity.model;
	let mv = camera.view * offsetModel;
	let mvp = camera.projection * mv;
	out.position = mvp * vec4(in.position, 1.0);
	out.uv = in.position.xy * 0.5 + 0.5;


	let triangleId = in.id / 3;
	if material.emissive > 0 {
		out.normal = vec3(0.0);
	}
	else {
		out.normal = (entity.model * vec4(normalize(in.normal), 0.0)).xyz;
	}

	let modelPosition = offsetModel * vec4(in.position, 1.0);
	out.modelPosition = modelPosition.xyz / modelPosition.w;
	out.modelNormal = (mv * vec4(in.normal, 0.0)).xyz;

	let vertexColor = uintToColor(in.color);
	let instanceColor = uintToColor(in.instanceColor);
	let materialColor = uintToColor(material.color);
	if vertexColor.r == 1.0 && vertexColor.g == 1.0 && vertexColor.b == 1.0 && vertexColor.a == 1.0 {
		out.color = instanceColor * materialColor;
	}
	else {
		out.color = vertexColor * materialColor;
	}
	out.triangleId = (rnd3uu(vec3(triangleId + entity.id))) % 0xff;

	return out;
}


@fragment
fn fs_main(in: VertexOut) -> FragmentOut {
	var out: FragmentOut;
	var color = in.color;
	if color.a == 0.0 {
		discard;
	}

	var shade = 0.0;
	var shadowCount = 8u;

	if material.receiveShadows > 0 {
		for (var i = 0u; i < shadowCount; i++) {
			let shadow = shadows[i];
			if (shadow.radius <= 0.0) {
				continue;
			}

			// If object is below shadow
			if (shadow.position.y >= in.modelPosition.y) {
				let p = in.modelPosition.xz - shadow.position.xz;
				var shadowDist = length(p);
				var alt = abs(in.modelPosition.y - shadow.position.y);

				var radalt = clamp(alt/2.0 + 2.0, 0.0, 32.0);
				var radius = shadow.radius * radalt;

				if (shadowDist < radius) {
					//let d = sdPentagon(p / radius * 2.0, 1.0);
					let d = (shadowDist - radius) / radius;
					if d < 0.0 {
						shade = smoothstep(0.0, -0.6, d);
						shade *= 0.7 - clamp(alt/10.0, 0.0, 0.4);
					}
				}
			}
		}
	}

	let opacity = color.a;


	if color.a >= 0.99 {
		out.normal = vec4(in.normal, 0.0);
		out.metaOutput = in.triangleId;
	}
	else {
		color.a = 1.0;
		let ditherCoord = vec2(i32(in.position.x) % 4, i32(in.position.y) % 4);
		let ditherVal = ditherMatrix[ditherCoord.x][ditherCoord.y];
		if opacity < ditherVal {
			discard;
		}
	}
	out.albedo =  vec4((color.rgb * (1.0-shade)) * color.a, color.a);
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
