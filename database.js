module.exports = mysql.createPool({
    host: 'piwabot-mysql',
    user: process.env['MYSQL_USER'],
    password: process.env['MYSQL_PASSWORD'],
    database: process.env['MYSQL_DATABASE'],

    supportBigNumbers: true,
    bigNumberStrings : true
})
