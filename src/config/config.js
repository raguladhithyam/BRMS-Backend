require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'ragul',
    password: process.env.DB_PASSWORD || 'mynameisragul1@',
    database: process.env.DB_NAME || 'blood_request_db',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log
  },
  test: {
    username: process.env.DB_USER || 'ragul',
    password: process.env.DB_PASSWORD || 'mynameisragul1@',
    database: process.env.DB_NAME + '_test' || 'blood_request_db_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};