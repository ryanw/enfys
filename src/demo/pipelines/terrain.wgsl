struct Vertex {
	// array instead of vec to avoid alignment issues
	position: array<f32, 3>,
	normal: array<f32, 3>,
	uv: array<f32, 2>,
}

struct Triangle {
	vertices: array<Vertex, 3>,
}

struct Uniforms {
	t: f32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var<storage, read_write> triangles: array<Triangle>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
	let id = globalId.x;
	var tri = triangles[id];
	let t = u.t / 10.0;

	for (var i = 0; i < 3; i++) {
		let p = toVec(tri.vertices[i].position);
		tri.vertices[i].position[1] = (sin((p.x + t) * 20.0) + sin(p.z * 20.0)) * 10.0;
	}
	let normal = calculateNormal(tri);
	for (var i = 0; i < 3; i++) {
		tri.vertices[i].normal = array(normal.x, normal.y, normal.z);
	}
	triangles[id] = tri;
}

fn calculateNormal(tri: Triangle) -> vec3f {
	let p0 = toVec(tri.vertices[0].position);
	let p1 = toVec(tri.vertices[1].position);
	let p2 = toVec(tri.vertices[2].position);

	let v0 = p1 - p0;
	let v1 = p2 - p0;
	return normalize(cross(v0, v1));
}

fn toVec(v: array<f32, 3>) -> vec3f {
	return vec3(v[0], v[1], v[2]);
}
