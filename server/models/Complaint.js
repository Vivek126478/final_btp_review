const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Complaint = sequelize.define('Complaint', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  complainantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'complainant_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  accusedId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'accused_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  rideId: {
    type: DataTypes.INTEGER,
    field: 'ride_id',
    references: {
      model: 'rides',
      key: 'id'
    }
  },
  category: {
    type: DataTypes.ENUM('harassment', 'safety', 'fraud', 'other'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'investigating', 'resolved', 'dismissed'),
    defaultValue: 'pending'
  },
  adminNotes: {
    type: DataTypes.TEXT,
    field: 'admin_notes'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    field: 'resolved_at'
  },
  blockchainTxHash: {
    type: DataTypes.STRING(66),
    field: 'blockchain_tx_hash'
  },
  blockchainDisputeId: {
    type: DataTypes.INTEGER,
    field: 'blockchain_dispute_id'
  }
}, {
  tableName: 'complaints',
  timestamps: true,
  underscored: true
});

module.exports = Complaint;
