'use strict';
const User = require('../model/user.js');
const sqlite = require('sqlite3');
const saltHash = require('password-salt-and-hash');

class UserDBU {

    // attributes
    // - db (Database)
    // - dbname (string)

    // constructor
    constructor(dbname) {
        this.dbname = dbname;
        this.db = new sqlite.Database(dbname, (err) => {
            if (err) throw err;
        });
        
    }

    // returns true if the password matches, false otherwise
    // if no user matches the pair username, type, an exception is thrown
    async checkPassword(username, type, password) {
        let info;
        try{
            info = await this.#loadPassword(username, type);
        } catch(err) {  // if the database access generates an exception, propagate it
            throw(err);
        }
        if(!info)
            throw({error: 'No matching user!'});

        return saltHash.verifySaltHash(info.salt, info.password, password);
    }

    loadUser(username=undefined, type=undefined, id=undefined) {
        const sqlUser = 'SELECT * FROM USERS WHERE email=? AND type=?';
        const sqlType = 'SELECT * FROM USERS WHERE type=?';
        const sqlAll = 'SELECT * FROM USERS WHERE type<>"manager"';
        const sqlId = 'SELECT * FROM USERS WHERE id=?'

        let sqlInfo = {sql: undefined, values: undefined};

        if(!username && !type && !id) {
            // get all users, except managers
            sqlInfo.sql = sqlAll;
            sqlInfo.values = [];
        } else if(id && !username && !type) {
            // get user by id
            sqlInfo.sql = sqlId;
            sqlInfo.values = [id];
        } else if(type && !username) {
            // get users by type
            sqlInfo.sql = sqlType;
            sqlInfo.values = [type];
        } else {
            // get user by (username, type) pair
            sqlInfo.sql = sqlUser;
            sqlInfo.values = [username, type];
        }

        return new Promise((resolve, reject) => {
            
            this.db.all(sqlInfo.sql, sqlInfo.values, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                const users = rows.map((u) => {
                    const user = new User(u.id, u.name, u.surname, u.email, u.type);
                    return user;
                });
                resolve(users);
            });
        });
    }

    // private method to load password information
    #loadPassword(username, type) {
        return new Promise((resolve, reject) => {
            const user = 'SELECT salt, password FROM USERS WHERE email=? AND type=?';
            this.db.get(user, [username, type], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row ? {salt: row.salt, password: row.password} : undefined);
            });
        });
    }
    
}

module.exports = UserDBU;