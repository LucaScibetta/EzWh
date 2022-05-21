'use strict';

const sqlite = require('sqlite3');

// open the database
const db = new sqlite.Database('ezwh.db', (err) => {
    if (err) throw err;
});

exports.prepareTable = async () => {
    await fillTable();
}

exports.resetTable = async () => {
    await cleanTable();
}

exports.voidRestockOrder = async () =>{
    await cleanRestockOrder();
    await cleanProductRko();
    await cleanSkuItemRko();

    await resetRestockOrder();
    await resetProcuctRko();
    await resetSkuItemRko();
}
//empty db
async function cleanTable() {
    //delete all the elements of the table
    await cleanSku();
    await cleanSkuItem();
    await cleanRestockOrder();
    await cleanProductRko();
    await cleanSkuItemRko();
    await cleanTestDescriptor();
    await cleanTestResult();

    //reset the autoincrement
    await resetSku();
    await resetSkuItem();
    await resetRestockOrder();
    await resetProcuctRko();
    await resetSkuItemRko();
    await resetTestDescriptor()
    await resetTestResult();
}

//popolate db
async function fillTable() {

    await insertSKU('test1',100,100,'test1',1,100);
    await insertSKU('test2',100,100,'test2',1,100);

    await insertSkuItem("123", 1, '2022/04/04');
    await insertSkuItem("456", 2, '2022/04/04');

    await insertRestockOrder('2022/04/04', 'ISSUED', 5);
    await insertProductRko(1, 1, "descrizione1", 1, 1);
    await insertSkuItemRko(1, 1, 1);

    await insertRestockOrder('2022/04/04', 'COMPLETEDRETURN', 5);
    await insertProductRko(2, 1, "descrizione2", 1, 1);
    await insertSkuItemRko(2, 1, 2);

    await insertTestDescriptor('td1','test',1);
    await insertTestResult(1,1,'2022/04/04','Fail');
    await insertTestResult(2,1,'2022/04/04','Pass');

    /*      const id3 = await insertOrder('2022/04/04','DELIVERY', 1, ,"transportNote");
      await insertProduct(id3, 1, "descrizione3", 1, 1);
      await insertSkuItem(id3, 1,3);
  
      const id4 = await insertOrder('2022/04/04','DELIVERED', 1, );
      await insertProduct(id4, 1, "descrizione4", 1, 1);
      await insertSkuItem(id4, 1,4); */
}

/* 
INSERT
*/

function insertSKU(description, weight, volume, notes, price, availableQuantity) {
    return new Promise((resolve, reject) => {
        const sqlInsert = 'INSERT INTO SKUS (description, weight, volume, notes, price, availableQuantity) VALUES(?,?,?,?,?,?)';
        db.run(sqlInsert, [description, weight, volume, notes, price, availableQuantity], (err) => {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function insertSkuItem(rfid, skuId, dateOfStock) {
    return new Promise((resolve, reject) => {
        const sqlInsert = 'INSERT INTO "SKU-ITEMS" (RFID, SKUId, Available, DateOfStock) VALUES(?,?,0,?)';
        db.run(sqlInsert, [rfid, skuId, dateOfStock], (err) => {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function insertRestockOrder(newDate, newState, supplierId, transportNote = '') {
    return new Promise((resolve, reject) => {
        const sqlInsert = 'INSERT INTO "restock-orders" (issueDate, state, supplierId, transportNote) VALUES(?,?,?,?)';
        db.run(sqlInsert, [newDate, newState, supplierId, transportNote], function (err) {
            if (err) {
                reject(err);
                return;
            }
            else {
                resolve(this.changes);
            }
        });
    });
}

function insertProductRko(orderId, SKUId, description, price, qty) {
    return new Promise((resolve, reject) => {
        const insert = 'INSERT INTO "products-rko" (orderId, skuId, description, price, quantity) VALUES (?,?,?,?,?)';
        db.run(insert, [orderId, SKUId, description, price, qty], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function insertSkuItemRko(orderId, SKUId, SKUItemId) {
    return new Promise((resolve, reject) => {
        const addItem = 'INSERT INTO "sku-items-rko" (orderId, skuItemId, skuId) VALUES (?,?,?)';
        db.run(addItem, [orderId, SKUItemId, SKUId], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function insertTestDescriptor(testName, procedureDescription, SKUid){
    return new Promise((resolve,reject) => {
        const sqlInsert = 'INSERT INTO "TEST-DESCRIPTORS"(name, procedureDescription, idSKU) VALUES(?,?,?)';
        db.all(sqlInsert, [testName, procedureDescription, SKUid], (err) => {
            if(err) {
                reject(err);
                return;
            }
            else resolve('Done');
        });
    });
}

function insertTestResult(isSKUitem, descriptorId, date, result){
    return new Promise((resolve,reject) => {
        const sqlInsert = 'INSERT INTO "TEST-RESULTS"(SKUitemId, descriptorId, date, result) VALUES(?,?,?,?)';
        db.all(sqlInsert, [isSKUitem, descriptorId, date, result], (err) => {
            if(err) {
                reject(err);
                return;
            }
            else resolve('Done');
        });
    });
}

/*
CLEAN
*/

function cleanRestockOrder() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM "restock-orders"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function cleanProductRko() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM "products-rko"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function cleanSkuItemRko() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM "sku-items-rko"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function cleanSku() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM "skus"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function cleanSkuItem() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM "sku-items"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function cleanTestDescriptor() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM "test-descriptors"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function cleanTestResult() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM "test-results"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}
/*
RESET
*/

function resetRestockOrder() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM SQLITE_SEQUENCE WHERE name="restock-orders"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}
function resetProcuctRko() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM SQLITE_SEQUENCE WHERE name="products-rko"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function resetSkuItemRko() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM SQLITE_SEQUENCE WHERE name="sku-items-rko"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function resetSku() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM SQLITE_SEQUENCE WHERE name="skus"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function resetSkuItem() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM SQLITE_SEQUENCE WHERE name="sku-items"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}

function resetTestDescriptor() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM SQLITE_SEQUENCE WHERE name="test-descriptors"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}
function resetTestResult() {
    return new Promise((resolve, reject) => {
        const sqlDelete = 'DELETE FROM SQLITE_SEQUENCE WHERE name="test-results"';
        db.run(sqlDelete, [], function (err) {
            if (err) {
                reject(err);
                return;
            } else resolve('Done');
        });
    });
}
