const mysql = require('mysql')
const { MysqlServerHostname } = require('./index')

class Database {
    constructor(user, password, database) {
        this._pool = mysql.createPool({
            host:     MysqlServerHostname,
            user:     user     ,
            password: password ,
            database: database 
        })
    }

    query(format, args) {
        return new Promise((resolve, reject) => {
            this._pool.query(format, args, (err, results) => {
                if (err) return reject(err)
                resolve(results)
            })
        })
    }

    async get(format, args) {
        return (await this.query(format, args))[0]
    }
}

module.exports = { Database }