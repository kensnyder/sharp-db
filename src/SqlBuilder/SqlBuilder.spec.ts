const SqlBuilder = require('./SqlBuilder.js');

describe('SqlBuilder', () => {
	describe('buildWhere()', () => {
		it('should handle single strings', async () => {
			const sql = SqlBuilder.buildWhere('status = 5');
			expect(sql).toBe('status = 5');
		});
		it('should handle single values', async () => {
			const sql = SqlBuilder.buildWhere('status', 5);
			expect(sql).toBe('`status` = 5');
		});
		it('should handle single strings with expressions', async () => {
			const sql = SqlBuilder.buildWhere('SUM(size) < 1024');
			expect(sql).toBe('SUM(size) < 1024');
		});
		it('should handle between', async () => {
			const sql = SqlBuilder.buildWhere('status BETWEEN', [1, 3]);
			expect(sql).toBe('`status` BETWEEN 1 AND 3');
		});
		it('should handle expressions', async () => {
			const sql = SqlBuilder.buildWhere('COUNT(*) BETWEEN', [1, 3]);
			expect(sql).toBe('COUNT(*) BETWEEN 1 AND 3');
		});
		it('should handle >', async () => {
			const sql = SqlBuilder.buildWhere('id >', 5);
			expect(sql).toBe('`id` > 5');
		});
		it('should handle !=', async () => {
			const sql = SqlBuilder.buildWhere('id !=', 5);
			expect(sql).toBe('`id` != 5');
		});
		it('should handle null', async () => {
			const sql = SqlBuilder.buildWhere('deleted_at', null);
			expect(sql).toBe('`deleted_at` IS NULL');
		});
		it('should handle implicit IN()', async () => {
			const sql = SqlBuilder.buildWhere('status', [1, 3]);
			expect(sql).toBe('`status` IN(1,3)');
		});
		it('should handle explicit IN()', async () => {
			const sql = SqlBuilder.buildWhere('status IN', [1, 3]);
			expect(sql).toBe('`status` IN(1,3)');
		});
		it('should handle implicit NOT IN()', async () => {
			const sql = SqlBuilder.buildWhere('status !=', [1, 3]);
			expect(sql).toBe('`status` NOT IN(1,3)');
		});
		it('should handle explicit NOT IN()', async () => {
			const sql = SqlBuilder.buildWhere('status NOT IN', [1, 3]);
			expect(sql).toBe('`status` NOT IN(1,3)');
		});
		it('should handle IS NULL', async () => {
			const sql = SqlBuilder.buildWhere('status', null);
			expect(sql).toBe('`status` IS NULL');
		});
		it('should handle equals IS NULL', async () => {
			const sql = SqlBuilder.buildWhere('status =', null);
			expect(sql).toBe('`status` IS NULL');
		});
		it('should handle IS NOT NULL', async () => {
			const sql = SqlBuilder.buildWhere('status !=', null);
			expect(sql).toBe('`status` IS NOT NULL');
		});
		it('should check hasOwnProperty', async () => {
			const obj = Object.create({
				a: 1,
			});
			obj.b = 2;
			const sql = SqlBuilder.buildWheres(obj);
			expect(sql).toBe('`b` = 2');
		});
	});
	describe('exportRows()', () => {
		it('should return null if there are no rows', async () => {
			const sql = SqlBuilder.exportRows('posts', []);
			expect(sql).toBe(null);
		});
	});
});
