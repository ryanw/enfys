@group(0) @binding(0)
var<storage, read_write> front: array<u32>;

@group(0) @binding(1)
var<uniform> arena: Arena;

@group(0) @binding(2)
var<uniform> brush: Brush;

struct Arena {
	size: vec2f,
	time: f32,
}

struct Brush {
	position: vec2i,
	size: u32,
	material: u32,
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
	let b = f32(brush.size) / 2.0;
	let p = vec2f(globalId.xy) - b;
	if length(p) > b {
		return;
	}
	let pos = vec2i(globalId.xy) + brush.position - i32(b);
	let idx = pos.x + pos.y * i32(ceil(arena.size.x));
	let v = rnd3(vec3(p, arena.time));
	if brush.material > 1u || v > 0.5 {
		front[idx] = brush.material;
	}
}



@import "engine/shaders/noise.wgsl";
