const { Db } = require('../../index.js');

describe('Db', () => {
	describe('class', () => {
		it('should be instantiable', () => {
			const db = Db.factory();
			expect(db).toBeInstanceOf(Db);
		});
		it('should work as singleton', () => {
			const db1 = Db.factory();
			const db2 = Db.factory();
			expect(db1).toBe(db2);
		});
	});

	describe('binding', () => {
		it('should bind numbers', () => {
			const db = Db.factory();
			const bound = db.bindArgs('WHERE a = ? AND b = ?', [1, 2]);
			expect(bound.sql).toBe('WHERE a = 1 AND b = 2');
		});
		it('should bind true', () => {
			const db = Db.factory();
			const bound = db.bindArgs('WHERE is_success = :isSuccess', [
				{
					isSuccess: true,
				},
			]);
			expect(bound.sql).toBe('WHERE is_success = true');
		});
		it('should bind false', () => {
			const db = Db.factory();
			const bound = db.bindArgs('WHERE is_active = ?', [false]);
			expect(bound.sql).toBe('WHERE is_active = false');
		});
		it('should bind arrays', () => {
			const db = Db.factory();
			const bound = db.bindArgs('WHERE id IN(?)', [[1, 2, 3]]);
			expect(bound.sql).toBe('WHERE id IN(1, 2, 3)');
		});
		it('should bind nulls', () => {
			const db = Db.factory();
			const bound = db.bindArgs('SET a = ?', [null]);
			expect(bound.sql).toBe('SET a = NULL');
		});
	});
	//
	// describe('multi-queries', () => {
	// 	it('should run with SELECT', function()  {
	// 		const db = Db.factory();
	// 		$sql = 'SELECT COUNT(*) AS acount FROM affiliations; SELECT COUNT(*) AS ccount FROM clients;';
	// 		$res = $db->multiQuery($sql);
	// 		expect($db->error()).toBe('');
	// 		expect($res)->to->have->size(2);
	// 		expect($res[0][0]->acount)->to->be->gt(0);
	// 		expect($res[1][0]->ccount)->to->be->gt(0);
	// 	});
	// 	it('should run with INSERT, SELECT, DELETE', function()  {
	// 		const db = Db.factory();
	// 		$rand = uniqid('unit-test-domain-');
	// 		$sql = '
	// 		INSERT INTO domain_names VALUES (NULL, :rand);
	// 		SELECT * FROM domain_names WHERE name = :rand;
	// 		DELETE FROM domain_names WHERE name = :rand;
	// 		SELECT COUNT(*) AS cnt FROM domain_names WHERE name = :rand;
	// 		';
	// 		$res = $db->multiQuery($sql, compact('rand'));
	// 		expect($res)->to->have->size(4);
	// 		expect($res[1][0]->name).toBe($rand);
	// 		expect($res[3][0]->cnt)->to->be->oneOf([0, "0"]);
	// 	});
	// });
});
