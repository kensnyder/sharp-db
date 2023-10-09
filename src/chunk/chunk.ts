/**
 * @param array The array to process
 * @param size The length of each chunk
 * @return The new array of chunks
 */
export default function chunk(array: any[], size: number) {
	const chunkCount = Math.ceil(array.length / size);
	const result = [];
	for (let i = 0; i < chunkCount; i++) {
		result.push(array.slice(i * size, (i + 1) * size));
	}
	return result;
}
