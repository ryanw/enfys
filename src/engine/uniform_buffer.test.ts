import { Gfx } from 'engine';
import { UniformBuffer } from './uniform_buffer';

const GPU_GLOBALS: Record<string, any> = {
	GPUBufferUsage: {
		MAP_READ: 1,
		MAP_WRITE: 2,
		COPY_SRC: 4,
		COPY_DST: 8,
		INDEX: 16,
		VERTEX: 32,
		UNIFORM: 64,
		STORAGE: 128,
		INDIRECT: 256,
		QUERY_RESOLVE: 512
	}
};

Object.assign(window, GPU_GLOBALS);

function getMockGfx(): Gfx {
	return {
		createBuffer: jest.fn().mockReturnValue(null),
	} as any as Gfx;
}


describe('UniformBuffer', () => {
	test('creates a GPUBuffer with the correct size and usage flags', () => {
		const gfx = getMockGfx();
		new UniformBuffer(
			gfx,
			[
				['a', 'u32'],
				['b', 'vec3f'],
				['c', 'u32'],
				['d', 'u32'],
				['e', 'mat4x4f'],
			]
		);

		const expectedSize = 256;
		const expectedUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
		expect(gfx.createBuffer).toHaveBeenCalledTimes(1);
		expect(gfx.createBuffer).toHaveBeenCalledWith(expectedSize, expectedUsage);
	});

	test('aligns fields correctly', () => {
		const gfx = getMockGfx();
		const buffer = new UniformBuffer(
			gfx,
			[
				['a', 'u32'],
				['b', 'vec3f'],
				['c', 'u32'],
				['d', 'u32'],
				['e', 'mat4x4f'],
				['f', 'i32'],
				['g', 'vec2u'],
			]
		);

		expect(buffer.offsets.a).toStrictEqual(['u32', 0]);
		expect(buffer.offsets.b).toStrictEqual(['vec3f', 16]);
		expect(buffer.offsets.c).toStrictEqual(['u32', 28]);
		expect(buffer.offsets.d).toStrictEqual(['u32', 32]);
		expect(buffer.offsets.e).toStrictEqual(['mat4x4f', 48]);
		expect(buffer.offsets.f).toStrictEqual(['i32', 112]);
		expect(buffer.offsets.g).toStrictEqual(['vec2u', 120]);
	});
});

