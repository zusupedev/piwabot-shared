const mysql = require('mysql')

module.exports = mysql.createPool({
    host: 'piwabot-mariadb',
    user: process.env['MARIADB_USER'],
    password: process.env['MARIADB_PASSWORD'],
    database: process.env['MARIADB_DATABASE'],

    supportBigNumbers: true,
    bigNumberStrings : true
})
