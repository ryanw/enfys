struct Instance {
	offset: array<f32, 3>,
	color: u32,
}

struct Particle {
	velocity: array<f32, 3>,
	birth: f32,
}

struct Uniforms {
	origin: vec3f,
	time: f32,
	dt: f32,
	radius: f32,
	count: u32,
	seed: f32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var<storage, read_write> counter: atomic<u32>;

@group(0) @binding(2)
var<storage, read_write> instances: array<Instance>;

@group(0) @binding(3)
var<storage, read_write> particles: array<Particle>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
	let particleCount = f32(u.count);
	let maxAge = 0.5;
	let spread = 6.0;
	let idx = globalId.x;
	if idx >= u.count {
		return;
	}
	let timeOffset = (f32(idx) / particleCount) * maxAge;
	var instance: Instance = instances[idx];
	var particle: Particle = particles[idx];

	var p = vec3(instance.offset[0], instance.offset[1], instance.offset[2]);
	var velocity = vec3(particle.velocity[0], particle.velocity[1], particle.velocity[2]);

	let n0 = rnd3(particle.birth + vec3(f32(idx))) - 0.5;
	let n1 = rnd3(particle.birth + vec3(f32(idx + 10000))) - 0.5;
	let n2 = rnd3(particle.birth + vec3(f32(idx + 20000))) - 0.5;
	let n3 = rnd3(particle.birth + vec3(f32(idx + 30000))) - 0.5;

	let age = u.time - particle.birth - timeOffset;
	if age > maxAge {
		particle.birth = u.time;
		p = u.origin;
		velocity = vec3(n0, (n1 - 0.5)-1.0, n2);
		instance.color = 0xff00ffffu;
	}
	else {
		p += velocity * u.dt;
		instance.color = 0xffff00ffu;
	}

	instance.offset = array(p.x, p.y, p.z);
	particle.velocity = array(velocity.x, velocity.y, velocity.z);

	let dur = (age + timeOffset + n3/8.0) / maxAge;
	let hot = hsl(0.13, 1.0, 1.0);
	let mid = hsl(0.13, 1.0, 0.5);
	var cold = hsl(0.0, 1.0, 0.3);
	let ct = 1.0 - clamp(dur * 1.5, 0.0, 1.4);
	var color = vec4(0.0);
	if (ct < 0.5) {
		color = mix(cold, mid, ct * 2.0);
	} else {
		color = mix(mid, hot, (ct * 2.0 - 1.0));
	}
	let opacity = 1.0 - clamp(pow(dur, 4.0), 0.0, 0.5);
	color.a = opacity;
	instance.color = colorToUint(color);

	instances[idx] = instance;
	particles[idx] = particle;

/*
	let gid = f32(globalId.x);
	var p = vec3(instance.offset[0], instance.offset[1], instance.offset[2]);
	var velocity = vec3(particle.velocity[0], particle.velocity[1], particle.velocity[2]);

	let np0 = p + vec3(gid + 123.0 + u.time / 100.0);
	let np1 = p + vec3(gid + 333.0 + u.time / 100.0);
	let np2 = p + vec3(gid + 555.0 + u.time / 100.0);
	let np3 = p + vec3(gid - 321.0 + u.time / 100.0);
	var n0 = (rnd3(np0) - 0.5) * spread;
	var n1 = (rnd3(np1) - 1.0) * spread;
	var n2 = (rnd3(np2) - 0.5) * spread;
	var n3 = (rnd3(np3) - 0.5);

	let timeOffset = gid / particleCount;
	let t = u.time;

	let age = t - particle.birth;

	if particle.birth == 0.0 {
		particle.birth = t;
		velocity = vec3(n0, 0.0, n2) / 2.0;
		p = u.origin;
	}
	else if age > maxAge + timeOffset {
		particle.birth = t;
		velocity = vec3(n0, 0.0, n2) / 2.0;
		p = u.origin;
	}
	else {
		p += velocity * u.dt;
		// Add gravity
		velocity += vec3(0.0, -10.0, 0.0) * u.dt;
	}
	instance.offset = array(p.x, p.y, p.z);
	instance.color = colorToUint(hsl(age % 1.0, 1.0, 0.5));
	particle.velocity = array(velocity.x, velocity.y, velocity.z);

	let hot = hsl(0.13, 1.0, 1.0);
	let mid = hsl(0.13, 1.0, 0.5);
	var cold = hsl(0.0, 1.0, 0.3);
	let ct = 1.0 - age * 2.5;
	var color = vec4(0.0);
	if (ct < 0.5) {
		color = mix(cold, mid, ct * 2.0);
	} else {
		color = mix(mid, hot, (ct * 2.0 - 1.0));
	}
	let opacity = 1.0 - clamp(pow(age * 2.0, 3.0), 0.0, 1.0);
	color.a = opacity;
	instance.color = colorToUint(color);

	instances[idx] = instance;
	particles[idx] = particle;
	*/
}

@import "engine/shaders/color.wgsl";
@import "engine/shaders/noise.wgsl";
