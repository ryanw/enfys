import { generateChunks, subdivideChunk } from './chunker';

describe('Chunker', () => {
	test('it finds the correct chunks for 0 level', () => {
		const expectedChunks = [
			{ lod: 0, position: [0, 0] },
			{ lod: 0, position: [1, 0] },
			{ lod: 0, position: [1, 1] },
			{ lod: 0, position: [0, 1] },
		];
		const actualChunks = generateChunks(0.1, 0.1, 0, 0);
		expect(actualChunks).toEqual(expectedChunks);
	});

	test('it finds the correct chunks for 4 levels near origin', () => {
		const expectedChunks = [
			{ lod: 0, position: [0, 0] },
			{ lod: 0, position: [1, 0] },
			{ lod: 0, position: [1, 1] },
			{ lod: 0, position: [0, 1] },
			{ lod: 1, position: [2, 0] },
			{ lod: 1, position: [2, 2] },
			{ lod: 1, position: [0, 2] },
			{ lod: 2, position: [4, 0] },
			{ lod: 2, position: [4, 4] },
			{ lod: 2, position: [0, 4] },
			{ lod: 3, position: [8, 0] },
			{ lod: 3, position: [8, 8] },
			{ lod: 3, position: [0, 8] },
			{ lod: 4, position: [16, 0] },
			{ lod: 4, position: [16, 16] },
			{ lod: 4, position: [0, 16] },
		];
		const actualChunks = generateChunks(0.1, 0.1, 0, 4);
		expect(actualChunks.length).toEqual(expectedChunks.length);
		for (const expected of expectedChunks) {
			expect(actualChunks).toContainEqual(expected);
		}
	});

	test('it finds the correct chunks for 4 levels near right side', () => {
		const expectedChunks = [
			{ lod: 0, position: [ 14, 0 ] },
			{ lod: 0, position: [ 15, 0 ] },
			{ lod: 0, position: [ 15, 1 ] },
			{ lod: 0, position: [ 14, 1 ] },
			{ lod: 1, position: [ 12, 0 ] },
			{ lod: 1, position: [ 12, 2 ] },
			{ lod: 1, position: [ 14, 2 ] },
			{ lod: 2, position: [ 8, 0 ] },
			{ lod: 2, position: [ 8, 4 ] },
			{ lod: 2, position: [ 12, 4 ] },
			{ lod: 3, position: [ 0, 0 ] },
			{ lod: 3, position: [ 0, 8 ] },
			{ lod: 3, position: [ 8, 8 ] },
			{ lod: 4, position: [ 16, 0 ] },
			{ lod: 4, position: [ 0, 16 ] },
			{ lod: 4, position: [ 16, 16 ] }
		];
		const actualChunks = generateChunks(15.9, 0.1, 0, 4);
		expect(actualChunks.length).toEqual(expectedChunks.length);
		for (const expected of expectedChunks) {
			expect(actualChunks).toContainEqual(expected);
		}
	});

	test('it subdivides a chunk', () => {
		let chunks;

		chunks = subdivideChunk([0, 0], 1);
		expect(chunks).toEqual([[ 0, 0 ], [ 1, 0 ], [ 0, 1 ], [ 1, 1 ]]);

		chunks = subdivideChunk([0, 0], 2);
		expect(chunks).toEqual([[ 0, 0 ], [ 2, 0 ], [ 0, 2 ], [ 2, 2 ]]);

		chunks = subdivideChunk([0, 0], 3);
		expect(chunks).toEqual([[ 0, 0 ], [ 4, 0 ], [ 0, 4 ], [ 4, 4 ]]);

		chunks = subdivideChunk([0, 0], 4);
		expect(chunks).toEqual([[ 0, 0 ], [ 8, 0 ], [ 0, 8 ], [ 8, 8 ]]);

		chunks = subdivideChunk([0, 0], 5);
		expect(chunks).toEqual([[ 0, 0 ], [ 16, 0 ], [ 0, 16 ], [ 16, 16 ]]);
	});
});
