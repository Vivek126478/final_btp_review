const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ride = sequelize.define('Ride', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  blockchainRideId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'blockchain_ride_id'
  },
  hostId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'host_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  startLocation: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'start_location'
  },
  endLocation: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'end_location'
  },
  startLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    field: 'start_latitude'
  },
  startLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    field: 'start_longitude'
  },
  endLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    field: 'end_latitude'
  },
  endLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    field: 'end_longitude'
  },
  rideDateTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'ride_date_time'
  },
  availableSeats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'available_seats'
  },
  totalSeats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'total_seats'
  },
  pricePerSeat: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'price_per_seat'
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  vehicleInfo: {
    type: DataTypes.JSON,
    field: 'vehicle_info'
  },
  driverDetails: {
    type: DataTypes.JSON,
    field: 'driver_details'
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'completed', 'cancelled'),
    defaultValue: 'active'
  },
  notes: {
    type: DataTypes.TEXT
  },
  agreementHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'agreement_hash'
  },
  agreementData: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'agreement_data',
    comment: 'Raw string used to compute agreementHash for verification'
  },
  zkVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'zk_verified'
  },
  merkleAnchored: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'merkle_anchored'
  },
  merkleBatchId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'merkle_batch_id'
  }
}, {
  tableName: 'rides',
  timestamps: true,
  underscored: true
});

module.exports = Ride;
