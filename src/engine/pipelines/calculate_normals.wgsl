struct Vertex {
	position: array<f32, 3>,
	normal: array<f32, 3>,
	color: u32,
	softness: f32,
}

struct Triangle {
	vertices: array<Vertex, 3>,
}

struct Uniforms {
	count: u32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var<storage, read_write> triangles: array<Triangle>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
	let idx = globalId.x;
	if idx >= u.count {
		return;
	}
	var tri = triangles[idx];
	let normal = calculateNormal(tri);
	let normalArray = array(normal.x, normal.y, normal.z);
	tri.vertices[0].normal = normalArray;
	tri.vertices[1].normal = normalArray;
	tri.vertices[2].normal = normalArray;
	triangles[idx] = tri;
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
