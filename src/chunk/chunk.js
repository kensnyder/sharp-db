/**
 * @param {Array} array The array to process
 * @param {number} size The length of each chunk
 * @return {Array} Returns the new array of chunks
 */
function chunk(array, size) {
	const chunkCount = Math.ceil(array.length / size);
	const result = [];
	for (let i = 0; i < chunkCount; i++) {
		result.push(array.slice(i * size, (i + 1) * size));
	}
	return result;
}

module.exports = chunk;
