const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  walletAddress: {
    type: DataTypes.STRING(42),
    allowNull: true,
    field: 'wallet_address'
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  profilePicture: {
    type: DataTypes.STRING(255),
    field: 'profile_picture'
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    field: 'phone_number'
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT
  },
  cancellationCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'cancellation_count'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isBanned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_banned'
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

module.exports = User;
