const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const rootEnvPath = path.join(__dirname, '../../.env');
const rootEnvExamplePath = path.join(__dirname, '../../.env.example');
const envPath = fs.existsSync(rootEnvPath) ? rootEnvPath : rootEnvExamplePath;
require('dotenv').config({ path: envPath });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'd_carpool',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'Vivek@1264',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
