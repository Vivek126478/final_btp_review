const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  pnr: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('flight', 'railway'),
    allowNull: false
  },
  departureStation: {
    type: DataTypes.STRING,
    allowNull: false
  },
  destinationStation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  departureTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'ACTIVE' // Active, Completed, Cancelled
  },
  lastChecked: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  tableName: 'Tickets'
});

module.exports = Ticket;
