@group(0) @binding(0)
var src: texture_2d<f32>;

@group(0) @binding(1)
var dst: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn init(@builtin(global_invocation_id) globalId: vec3<u32>) {
	let cell = vec2i(globalId.xy);
	let p = vec3f(f32(cell.x), f32(cell.y), 0) / 100.0;
	let value = fractalNoise(vec3f(globalId) / 100.0, 2);
	if value > 0.5 {
		birthCell(cell);
	} else {
		killCell(cell);
	}
}

@compute @workgroup_size(16, 16)
fn tick(@builtin(global_invocation_id) globalId: vec3<u32>) {
	let cell = vec2i(globalId.xy);
	if isOn(cell) {
		hurtCell(cell);
	}
	else if isDying(cell) {
		killCell(cell);
	}
	else {
		let liveNeighbours = countOnNeighbours(cell);
		if liveNeighbours == 2u {
			birthCell(cell);
		}
		else {
			killCell(cell);
		}
	}
}

@compute @workgroup_size(16, 16)
fn tickConway(@builtin(global_invocation_id) globalId: vec3<u32>) {
	let cell = vec2i(globalId.xy);
	let liveNeighbours = countNeighbours(cell);
	if isLive(cell) {
		if liveNeighbours < 2 || liveNeighbours > 3 {
			killCell(cell);
		}
		else {
			birthCell(cell);
		}
	} else if liveNeighbours == 3u {
		birthCell(cell);
	}
	else {
		killCell(cell);
	}
}

fn isOn(p: vec2<i32>) -> bool {
	return textureLoad(src, p, 0).r == 1.0;
}

fn isDying(p: vec2<i32>) -> bool {
	let v = textureLoad(src, p, 0).r;
	return v > 0.0 && v < 1.0;
}

fn isOff(p: vec2<i32>) -> bool {
	return textureLoad(src, p, 0).r == 0.0;
}

fn isLive(p: vec2<i32>) -> bool {
	return textureLoad(src, p, 0).r > 0.5;
}

fn birthCell(p: vec2<i32>) {
	textureStore(dst, p, vec4(1.0));
}

fn hurtCell(p: vec2<i32>) {
	textureStore(dst, p, vec4(0.5));
}

fn killCell(p: vec2<i32>) {
	textureStore(dst, p, vec4(0.0));
}

fn countNeighbours(p: vec2<i32>) -> u32 {
	var c = 0u;
	for (var y = -1; y <= 1; y++) {
		for (var x = -1; x <= 1; x++) {
			if (x == 0 && y == 0) {
				continue;
			}
			if isLive(p + vec2(x, y)) {
				c += 1;
			}
		}
	}
	return c;
}

fn countOnNeighbours(p: vec2<i32>) -> u32 {
	var c = 0u;
	for (var y = -1; y <= 1; y++) {
		for (var x = -1; x <= 1; x++) {
			if (x == 0 && y == 0) {
				continue;
			}
			if isOn(p + vec2(x, y)) {
				c += 1;
			}
		}
	}
	return c;
}

@import "engine/shaders/noise.wgsl";
