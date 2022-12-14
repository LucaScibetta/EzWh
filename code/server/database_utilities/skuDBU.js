'use strict';
const SKU = require('../model/sku.js');

const sqlite = require('sqlite3');

class SkuDBU {

    // attributes
    // - db (Database)

    // constructor
    constructor(dbname, db=undefined) {
        if (!db) {
            this.db = new sqlite.Database(dbname, (err) => {
                if (err) throw err;
            });
        } else {
            this.db = db;
        } 
    }

    loadSKU(skuId=undefined) {

        const sqlSku = 'SELECT skus.id AS id, skus.description AS description, skus.weight AS weight, \
            skus.volume AS volume, skus.notes AS notes, positions.positionId AS position, skus.price AS price, \
            skus.availableQuantity AS availableQuantity FROM skus LEFT JOIN positions ON skus.position=positions.id WHERE skus.id=?';
        const sqlAll = 'SELECT skus.id AS id, skus.description AS description, skus.weight AS weight, \
            skus.volume AS volume, skus.notes AS notes, positions.positionId AS position, skus.price AS price, \
            skus.availableQuantity AS availableQuantity FROM SKUS LEFT JOIN POSITIONS ON skus.position=positions.id';

        let sqlInfo = {sql: undefined, values: undefined};

        if(!skuId) {
            // get all skus
            sqlInfo.sql = sqlAll;
            sqlInfo.values = [];
        } else {
            // get sku by id
            sqlInfo.sql = sqlSku;
            sqlInfo.values = [skuId];
        }

        return new Promise((resolve, reject) => {
            this.db.all(sqlInfo.sql, sqlInfo.values, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                const skus = rows.map(async (s) => {
                    const sku = new SKU(s.id, s.description, s.weight, s.volume, s.notes, s.position, s.price, s.availableQuantity);
                    const tests = await this.#getTestDescriptors(s.id);
                    sku.setTestDescriptors(tests);
                    return sku;
                });
                Promise.all(skus).then((skus) => resolve(skus));
            });
        });
    }

    // return -> void
    insertSKU(description, weight, volume, notes, price, availableQuantity) {
        return new Promise((resolve, reject) => {
            const sqlInsert = 'INSERT INTO SKUS (description, weight, volume, notes, price, availableQuantity) VALUES(?,?,?,?,?,?)';
            this.db.run(sqlInsert, [description, weight, volume, notes, price, availableQuantity], (err) => {
                if (err) {
                    reject(err);
                    return;
                } else resolve('Done');
            });
        });
    }

    // this function returns the number of rows which has been modified
    async updateSKU(sku) {
        // get position, if defined
        let posId = sku.position;
        if (sku.position) {
            posId = await this.#getPositionIncrementalId(sku.position);
        }
        return new Promise((resolve, reject) => {
            const sqlUpdate = 'UPDATE SKUS SET description=?, weight=?, volume=?, notes=?, price=?, availableQuantity=?, position=? WHERE id=?';
            this.db.run(sqlUpdate, [sku.description, sku.weight, sku.volume, sku.notes, sku.price, sku.availableQuantity, 
                posId, sku.id], function (err) {
                if (err) {
                    reject(err);
                    return;
                } else resolve(this.changes);
            });
        });
    }

    async deleteSKU(id) {
        // check whether there are tables referencing that sku
        const dependency = await this.#checkDependency(id);
        if (false && dependency.some(d => d)) {
            // if there is at least 1 dependency
            throw(new Error("Dependency detected. Delete aborted.", 14));
        }
        return new Promise((resolve, reject) => {
            const sqlDelete = 'DELETE FROM SKUS WHERE id=?';
            this.db.run(sqlDelete, [id], function (err) {
                if (err) {
                    reject(err);
                    return;
                } else resolve(this.changes);
            });
        });
    }

    // returns true if the position is assigned to a sku, false otherwise
    searchAssignedPosition(positionId) {
        const sql = 'SELECT positions.positionId AS position FROM SKUS INNER JOIN POSITIONS ON skus.position=positions.id \
            WHERE positions.positionId=?';
        return new Promise((resolve, reject) => {
            this.db.get(sql, [positionId], (err, row) => {
                if(err) {
                    reject(err);
                    return;
                }
                resolve(row ? true : false);
            })
        });
        
    }

    // private method to get test descriptors for a given skuId 
   #getTestDescriptors(id) {
        return new Promise((resolve, reject) => {
            const test = 'SELECT id FROM "TEST-DESCRIPTORS" WHERE idSKU=?';
            this.db.all(test, [id], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            const tests = rows.map((t) => t.id);
            resolve(tests);;
            });
        });
   }

   #getPositionIncrementalId(positionId) {
        const sql = 'SELECT id FROM positions WHERE positionId=?'
        return new Promise((resolve, reject) => {
            this.db.get(sql, [positionId], (err, row) => {
                if(err) {
                    reject(err);
                    return;
                }
                resolve(row ? row.id : undefined);
            })
        });
   }

   #checkDependency(id) {
    // skus can be referenced by
    // - items
    // - sku-item
    // - test-descriptors
    // - restock-order (it is actually a dependency of items, hence checking it is not necessary)
    // - return-order (again, it is a dependency)
    // - internal-order (again, it is a dependency)
    const results = [];
    // items check
    results.push(new Promise((resolve, reject) => {
        const sku = 'SELECT SKUId FROM items WHERE SKUId=?';
        this.db.all(sku, [id], (err, rows) => {
        if (err) {
            reject(err);
            return;
        }
        if (!rows || rows.length == 0)
            resolve(false);
        else resolve(true);
        return;
        });
    }));
    // sku-items check
    results.push(new Promise((resolve, reject) => {
        const sku = 'SELECT SKUId FROM "sku-items" WHERE SKUId=?';
        this.db.all(sku, [id], (err, rows) => {
        if (err) {
            reject(err);
            return;
        }
        if (!rows || rows.length == 0)
            resolve(false);
        else resolve(true);
        return;
        });
    }));
    // test-descriptors check
    results.push(new Promise((resolve, reject) => {
        const sku = 'SELECT idSKU FROM "test-descriptors" WHERE idSKU=?';
        this.db.all(sku, [id], (err, rows) => {
        if (err) {
            reject(err);
            return;
        }
        if (!rows || rows.length == 0)
            resolve(false);
        else resolve(true);
        return;
        });
    }));
    return Promise.all(results);
}

    
}

module.exports = SkuDBU;