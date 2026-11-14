const mongoose = require('mongoose');

const User = mongoose.model(
  'User',
  new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, unique: true, trim: true },
      password: { type: String, required: true },
      role: { type: String, enum: ['coordinator', 'driver'], default: 'driver' },
    },
    { timestamps: true }
  )
);

// One person to pick up: who, from where, and (optionally) where to drop
const stopSchema = new mongoose.Schema({
  personName: { type: String, required: true, trim: true },
  personPhone: { type: String, trim: true },
  pickupFrom: { type: String, required: true, trim: true },
  dropAt: { type: String, trim: true },
  note: { type: String, trim: true },
  done: { type: Boolean, default: false },
});

const Trip = mongoose.model(
  'Trip',
  new mongoose.Schema(
    {
      title: { type: String, required: true, trim: true },
      date: { type: Date, required: true },
      car: { name: String, number: String },
      driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      // Lender is optional: leave empty if the car has no separate lender
      lender: { name: String, phone: String },
      status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
      stops: [stopSchema],
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
);

const Passenger = mongoose.model(
  'Passenger',
  new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      phone: { type: String, trim: true },
      address: { type: String, required: true, trim: true },
      landmark: { type: String, trim: true },
      details: { type: String, trim: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
);

module.exports = { User, Trip, Passenger };
