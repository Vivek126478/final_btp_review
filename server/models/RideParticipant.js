const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RideParticipant = sequelize.define('RideParticipant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  rideId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'ride_id',
    references: {
      model: 'rides',
      key: 'id'
    }
  },
  riderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'rider_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  seatsBooked: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'seats_booked'
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired', 'joined', 'left', 'completed'),
    defaultValue: 'pending'
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'joined_at'
  },
  leftAt: {
    type: DataTypes.DATE,
    field: 'left_at'
  }
}, {
  tableName: 'ride_participants',
  timestamps: true,
  underscored: true
});

module.exports = RideParticipant;
