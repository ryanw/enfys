struct Instance {
	// array instead of vec to avoid alignment issues
	offset: array<f32, 3>,
	color: u32,
}

struct Uniforms {
	position: vec2f,
	spacing: vec2f,
	density: f32,
	terrainSeed: f32,
	decorSeed: f32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var<storage, read_write> counter: atomic<u32>;

@group(0) @binding(2)
var<storage, read_write> instances: array<Instance>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>, @builtin(num_workgroups) num: vec3<u32>) {
	let cellSize = 256.0;
	let rp = round(u.position);
	var p = vec3f(
		rp.x + (f32(globalId.x) - (cellSize/4.0)) * cellSize,
		0.0,
		rp.y + (f32(globalId.y) - (cellSize/4.0)) * cellSize,
	);
	let isBuildingCell = buildingCell(p.xz, u.terrainSeed) > 0.0;
	if !isBuildingCell {
		return;
	}
	p += vec3(cellSize/2.0, 0.0, cellSize/2.0);
	p.y = landHeight(p, u.terrainSeed) + 30.0;;

	var instance: Instance;
	// Gap around player start
	if length(p.xz) < 3.0 {
		//return;
	}
	instance.offset = array(p.x, p.y, p.z);

	instance.color = colorToUint(hsl(0.4, 0.6, 0.5));
	let count = atomicAdd(&counter, 1u);
	instances[count] = instance;
}

@import "./terrain_height.wgsl";
@import "engine/shaders/color.wgsl";
