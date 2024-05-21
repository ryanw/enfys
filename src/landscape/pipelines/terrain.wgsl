@import "./terrain_height.wgsl";

struct Vertex {
	// array instead of vec to avoid alignment issues
	position: array<f32, 3>,
	normal: array<f32, 3>,
	color: array<f32, 4>,
}

struct Triangle {
	vertices: array<Vertex, 3>,
}

struct Uniforms {
	size: vec2<i32>,
	chunkId: vec3<i32>,
	triangleCount: u32,
	seed: f32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var<storage, read_write> triangles: array<Triangle>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
	var triId = i32(globalId.x);
	var quadId = triId / 2;
	if triId >= i32(u.triangleCount) {
		return;
	}
	// New triangle to write to buffer
	var tri: Triangle;

	var TOP = 1;
	var RIGHT = 2;
	var BOTTOM = 4;
	var LEFT = 8;
	var flattenEdges = 0;


	var lod = f32(1+u.chunkId.z);
	var lodScale = f32(1 << u32(u.chunkId.z));
	var chunkP2 = vec2f(u.chunkId.xy) * vec2f(u.size);
	var chunkP = vec3(chunkP2.x, 0.0, chunkP2.y);

	var quadP = vec2(quadId % u.size.x, quadId / u.size.x);

	var p = vec3(f32(quadP.x), 0.0, f32(quadP.y));
	var h = 0.0;

	// Which triangle of the quad to draw
	var cellSize = lodScale;
	var q = vec3(f32(quadId % u.size.x) * cellSize, 0.0, f32(quadId / u.size.x) * cellSize);
	if triId % 2 == 0 {
		tri.vertices[0].position = array(q.x + 0.0, q.y, q.z + 0.0);
		tri.vertices[1].position = array(q.x + 0.0, q.y, q.z + cellSize);
		tri.vertices[2].position = array(q.x + cellSize, q.y, q.z + cellSize);
	} else {
		tri.vertices[0].position = array(q.x + cellSize, q.y, q.z + cellSize);
		tri.vertices[1].position = array(q.x + cellSize, q.y, q.z + 0.0);
		tri.vertices[2].position = array(q.x + 0.0, q.y, q.z + 0.0);
	}

	// Flatten edges to line up with lower LOD neighbour
	var isEdgeQuad = vec4(
		(flattenEdges & LEFT) > 0 && quadP.x == 0,
		(flattenEdges & RIGHT) > 0 && quadP.x == u.size.x - 1,
		(flattenEdges & BOTTOM) > 0 && quadP.y == 0,
		(flattenEdges & TOP) > 0 && quadP.y == u.size.y - 1,
	);
	// FIXME this is a mess
	for (var i = 0; i < 3; i++) {
		var tp = (toVec(tri.vertices[i].position) + chunkP * lodScale);
		h = landHeight(tp, u.seed);
		let color = mix(
			vec3(0.94, 0.61, 0.2),
			vec3(0.41, 0.84, 0.1),
			smoothstep(0.0, 1.0, h/7.0)
		);
		tri.vertices[i].color = array(color.r, color.g, color.b, 1.0);
		tri.vertices[i].position[1] += h;
	/*
		// Right + Left
		for (var j = 0; j < 2; j++) {
			var ij = abs(j-1);
			var isEdgeVertex = isEdgeQuad[ij] && (i == 2) == (triId % 2 == j);
			var isMid = isEdgeVertex && ((i == 0 && quadP.y % 2 == j) || (i == 1 && quadP.y % 2 == ij) || (i == 2 && quadP.y % 2 == j));

			if isMid {
				var h0 = landHeight(tp + vec3(0.0, 0.0, 1.0), u.seed);
				var h1 = landHeight(tp - vec3(0.0, 0.0, 1.0), u.seed);
				h = ((h0 + h1) / 2.0);
			}
		}
		// Top + Bottom
		for (var j = 0; j < 2; j++) {
			var ij = abs(j-1);
			var isEdgeVertex = isEdgeQuad[2 + ij] && (i == 0) == (triId % 2 == ij);
			var isMid = isEdgeVertex && ((i == 0 && quadP.x % 2 == j) || (i == 1 && quadP.x % 2 == ij) || (i == 2 && quadP.x % 2 == j));

			if isMid {
				var h0 = landHeight(tp + vec3(1.0, 0.0, 0.0), u.seed);
				var h1 = landHeight(tp - vec3(1.0, 0.0, 0.0), u.seed);
				h = ((h0 + h1) / 2.0);
			}
		}
		tri.vertices[i].position[1] += h;
		*/
	}

	// Entire triangle has same normal
	var normal = calculateNormal(tri);
	for (var i = 0; i < 3; i++) {
		tri.vertices[i].normal = array(normal.x, normal.y, normal.z);
	}
	triangles[triId] = tri;
}


fn oldlandHeight(op: vec3f, t: f32) -> f32 {
	var scale = 256.0;
	var p = op.xz / scale;
	var np = vec3(p.x, t, p.y);

	var octaves = 4;
	var amp = 128.0;
	var freq = 4.0;
	var d = 0.0;

	for (var i = 0; i < octaves; i++) {
		d += terrainNoise(np, freq, amp);
		freq *= 2.4;
		amp /= 1.3;
	}

	d /= f32(octaves);

	return d;
}

fn terrainNoise(p: vec3f, freq: f32, amp: f32) -> f32 {
	return smoothNoise(p * freq) * amp;
}

fn calculateNormal(tri: Triangle) -> vec3f {
	var p0 = toVec(tri.vertices[0].position);
	var p1 = toVec(tri.vertices[1].position);
	var p2 = toVec(tri.vertices[2].position);

	var v0 = p1 - p0;
	var v1 = p2 - p0;
	return normalize(cross(v0, v1));
}

fn toVec(v: array<f32, 3>) -> vec3f {
	return vec3(v[0], v[1], v[2]);
}

