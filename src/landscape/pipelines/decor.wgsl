struct Instance {
	// array instead of vec to avoid alignment issues
	offset: array<f32, 3>,
	color: u32,
}

struct Plane {
	origin: vec3f,
	normal: vec3f,
}

struct Uniforms {
	position: vec2f,
	spacing: vec2f,
	density: f32,
	terrainSeed: f32,
	decorSeed: f32,
	clipping: array<Plane, 6>,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var<storage, read_write> counter: atomic<u32>;

@group(0) @binding(2)
var<storage, read_write> instances: array<Instance>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>, @builtin(num_workgroups) num: vec3<u32>) {
	let p2 = round(u.position) + vec2f(globalId.xy) * u.spacing;
	let spacing = vec3f(u.spacing.x, 0.0, u.spacing.y);

	var p = vec3f(p2.x, 0.0, p2.y);

	// (workgroup size / 2) * num_workgroups
	p -= vec3(8.0 * f32(num.x), 0.0, 8.0 * f32(num.y)) * spacing;
	//p -= vec3(2.0 * f32(num.x), 0.0, 2.0 * f32(num.y)) * spacing;
	p += vec3(1.0, 0.0, 1.0) * spacing/2.0;
	p.y = landHeight(p, u.terrainSeed);
	var dp = p + vec3(u.decorSeed / 1000000.0);

	var n = rnd3(dp);

	if p.y > 0.01 && p.y < 64.0 && n < u.density {
		let isBuildingCell = buildingCell(p.xz, u.terrainSeed) > 0.0;
		if isBuildingCell {
			// No decor on building cells
			//return;
		}

		var n0 = (rnd3(dp + vec3(123.0)) - 0.5) * u.spacing.x;
		var n1 = (rnd3(dp + vec3(323.0)) - 0.5) * u.spacing.y;
		var instance: Instance;
		p.x += n0;
		p.z += n1;
		p.y = landHeight(p, u.terrainSeed);

		// Test for clipping
		for (var i = 0; i < 6; i++) {
			let n = u.clipping[i].normal;
			let o = u.clipping[i].origin + n * (length(u.spacing) / 2.0);
			let vp = normalize(p - o);
			let vd = dot(vp, n);
			if vd >= 0.0 {
				return;
			}
		}

		// Gap around player start
		if length(p.xz) < 3.0 {
			//return;
		}
		instance.offset = array(p.x, p.y, p.z);

		let hue = rnd3(dp + vec3(43.0));
		instance.color = colorToUint(hsl(hue, 0.6, 0.5));
		let count = atomicAdd(&counter, 1u);
		instances[count] = instance;
	}
}

@import "./terrain_height.wgsl";
@import "engine/shaders/color.wgsl";
