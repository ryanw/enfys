@group(0) @binding(0)
var<storage, read_write> front: array<u32>;

@group(0) @binding(1)
var<storage, read_write> back: array<u32>;

@group(0) @binding(2)
var<storage, read_write> dirty: array<u32>;

@group(0) @binding(3)
var<uniform> arena: Arena;

@group(0) @binding(4)
var<uniform> frame: Frame;

struct Arena {
	size: vec2f,
	time: f32,
}

struct Frame {
	frame: i32,
}

@compute @workgroup_size(16, 16)
fn init(@builtin(global_invocation_id) globalId: vec3<u32>) {
	let cell = vec2i(globalId.xy);
	let p = vec3f(f32(cell.x), f32(cell.y), 0) / 100.0;
	let idx = cell.x + cell.y * i32(arena.size.x);
	var value = fractalNoise(vec3f(globalId) / 100.0 + vec3(0.0, 0.0, arena.time/10.0), 2);
	value *= (p.y - 4.0);
	if value < 0.5 {
		// Sand
		front[idx] = 0x1u;
	}
	back[idx] = 0x0u;
}

@compute @workgroup_size(16, 16)
fn clear(@builtin(global_invocation_id) globalId: vec3<u32>) {
	let idx = globalId.x + globalId.y * u32(arena.size.x);
	dirty[idx] = 0x0u;
}

@compute @workgroup_size(16, 16)
fn paint(@builtin(global_invocation_id) globalId: vec3<u32>) {
	let idx = globalId.x + globalId.y * u32(arena.size.x);
	front[idx] = 0x2u;
}

@compute @workgroup_size(16, 16)
fn tick(@builtin(global_invocation_id) globalId: vec3<u32>) {
	let sliceWidth = 4;
	let sliceHeight = 1080;
	//var origin = vec2i(globalId.xy) * vec2(sliceWidth, sliceHeight) * 2;
	var origin = vec2i(globalId.xy) * vec2(sliceWidth, sliceHeight) * 2;

	switch frame.frame {
		case 0: {
			break;
		}
		case 1: {
			origin.x += sliceWidth;
			break;
		}
		case 2: {
			origin.y += sliceHeight;
			break;
		}
		case 3: {
			origin.x += sliceWidth;
			origin.y += sliceHeight;
			break;
		}
		default: {}
	}

	for (var y = 0; y < sliceHeight; y++) {
		for (var x = 0; x < sliceWidth; x++) {
			let off = vec2(x, y);
			tickCell(origin + off);
		}
	}
}

fn debugCell(cell: vec2i) {
	setCell(cell, 2u);
}

fn tickCell(cell: vec2i) {
	// Ignore if modified in this frame
	if isDirty(cell) {
		return;
	}
	let sand = getCell(cell);
	setCell(cell, sand);
	switch sand {
		// Sand
		case 1u: {
			let below = getCell(cell - vec2(0, 1));
			if below == 0u {
				// Nothing below, fall down 1
				setCell(cell, 0u);
				setCell(cell - vec2(0, 1), sand);
			}
			else if below == 3u {
				// On water
				setCell(cell - vec2(0, 1), sand);
				setCell(cell, below);
			}
			else {
				let left = cell - vec2(1, 1);
				let right = cell - vec2(-1, 1);
				if getCell(left) == 0u {
					setCell(cell, 0u);
					setCell(left, sand);
				}
				else if getCell(right) == 0u {
					setCell(cell, 0u);
					setCell(right, sand);
				}
			}
			break;
		}

		// Stone
		case 2u: {
			// Nothing
			break;
		}

		// Water
		case 3u: {
			if getCell(cell - vec2(0, 1)) == 0u {
				// Nothing below, fall down 1
				setCell(cell, 0u);
				setCell(cell - vec2(0, 1), sand);
			}
			else {
				let leftd = cell - vec2(1, 1);
				let rightd = cell - vec2(-1, 1);
				let left = cell - vec2(1, 0);
				let right = cell - vec2(-1, 0);
				if getCell(leftd) == 0u {
					setCell(cell, 0u);
					setCell(leftd, sand);
				}
				else if getCell(rightd) == 0u {
					setCell(cell, 0u);
					setCell(rightd, sand);
				}
				else if getCell(left) == 0u {
					setCell(cell, 0u);
					setCell(left, sand);
				}
				else if getCell(right) == 0u {
					setCell(cell, 0u);
					setCell(right, sand);
				}
			}
			break;
		}

		default: {
		}
	}
}

fn isDirty(cell: vec2i) -> bool {
	if (cell.x < 0 || cell.y < 0 || cell.x >= i32(arena.size.x) || cell.y >= i32(arena.size.y)) {
		return false;
	}
	let idx = cell.x + cell.y * i32(arena.size.x);
	return dirty[idx] > 0u;
}

fn getCell(cell: vec2i) -> u32 {
	if (cell.x < 0 || cell.y < 0 || cell.x >= i32(arena.size.x) || cell.y >= i32(arena.size.y)) {
		return 0xffffffffu;
	}
	let idx = cell.x + cell.y * i32(arena.size.x);
	return front[idx];
}


fn setCell(cell: vec2i, value: u32) {
	if (cell.x < 0 || cell.y < 0 || cell.x >= i32(arena.size.x) || cell.y >= i32(arena.size.y)) {
		return;
	}
	let idx = cell.x + cell.y * i32(arena.size.x);
	let oldValue = getCell(cell);
	//back[idx] = value;
	front[idx] = value;
	if oldValue != value {
		if value > 0u {
			dirty[idx] = 0xffu;
		}
		else {
			dirty[idx] = 0x0u;
		}
	}
}

@import "engine/shaders/noise.wgsl";
