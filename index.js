const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Ensure your .env file is configured with DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, and JWT_SECRET

const app = express();
const PORT = process.env.PORT || 5000;
const db = require('./config/db'); // Import the promise-based db connection from config/db.js

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper function for error handling - now using async/await consistent approach
const handleDbError = (res, err, context = 'Database operation') => {
  console.error(`${context} error:`, err.message || err); // Log the error message
  res.status(500).json({ message: `${context} failed`, error: err.message || 'Internal Server Error' });
};

// // Driver Registration
// app.post('/api/drivers/register', async (req, res) => {
//   const {
//     name,
//     email,
//     phoneNumber,
//     password,
//     rcNumber,
//     fcDate,
//     insuranceNumber,
//     insuranceExpiryDate,
//     drivingLicense,
//     drivingLicenseExpiryDate
//   } = req.body;

//   // Basic input validation
//   if (!name || !email || !phoneNumber || !password) {
//     return res.status(400).json({ message: 'Required fields (name, email, phoneNumber, password) are missing' });
//   }

//   try {
//     //const hashedPassword = await bcrypt.hash(password, 10);

//     const [result] = await db.query( // Using await with db.query
//       `INSERT INTO drivers
//        (name, email, phone, password, rc_number, fc_expiry, insurance_number, insurance_expiry, driving_license, dl_expiry)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         name,
//         email,
//         phoneNumber,
//         hashedPassword,
//         rcNumber || null, // Allow null if not provided
//         fcDate || null,
//         insuranceNumber || null,
//         insuranceExpiryDate || null,
//         drivingLicense || null,
//         drivingLicenseExpiryDate || null
//       ]
//     );
//     res.status(201).json({ message: 'Driver registered successfully', driverId: result.insertId });
//   } catch (err) {
//     // Check for duplicate entry error (e.g., email unique constraint)
//     if (err.code === 'ER_DUP_ENTRY') {
//       return res.status(409).json({ message: 'Email, phone, RC number, or insurance number already registered.' });
//     }
//     handleDbError(res, err, 'Driver registration');
//   }
// });

// Driver Registration
app.post('/api/drivers/register', async (req, res) => {
  const {
    name,
    email,
    phoneNumber,
    password,
    rcNumber,
    fcDate,
    insuranceNumber,
    insuranceExpiryDate,
    drivingLicense,
    drivingLicenseExpiryDate
  } = req.body;

  if (!name || !email || !phoneNumber || !password) {
    return res.status(400).json({ message: 'Required fields (name, email, phoneNumber, password) are missing' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO drivers
        (name, email, phone, password, rc_number, fc_expiry, insurance_number, insurance_expiry, driving_license, dl_expiry)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        phoneNumber,
        password, // stored as plain text (⚠️ not recommended for production)
        rcNumber || null,
        fcDate || null,
        insuranceNumber || null,
        insuranceExpiryDate || null,
        drivingLicense || null,
        drivingLicenseExpiryDate || null
      ]
    );

    res.status(201).json({ message: 'Driver registered successfully', driverId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email, phone, RC number, or insurance number already registered.' });
    }
    handleDbError(res, err, 'Driver registration');
  }
});


// Check if driver exists (email, phone, RC, insurance number)
app.post('/api/drivers/check-exists', async (req, res) => {
  const { email, phoneNumber, rcNumber, insuranceNumber } = req.body;

  try {
    const [rows] = await db.query( // Using await with db.query
      `SELECT email, phone, rc_number, insurance_number FROM drivers
       WHERE email = ? OR phone = ? OR rc_number = ? OR insurance_number = ?`,
      [email, phoneNumber, rcNumber, insuranceNumber]
    );

    const exists = {
      email: rows.some(r => r.email === email),
      phoneNumber: rows.some(r => r.phone === phoneNumber),
      rcNumber: rows.some(r => r.rc_number === rcNumber),
      insuranceNumber: rows.some(r => r.insurance_number === insuranceNumber),
    };

    res.json(exists);
  } catch (err) {
    handleDbError(res, err, 'Checking driver existence');
  }
});

// // Login
// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ message: 'Email and password are required' });
//   }

//   try {
//     const [rows] = await db.query('SELECT * FROM drivers WHERE email = ?', [email]); // Using await

//     if (rows.length === 0) {
//       return res.status(401).json({ message: 'Invalid email or password' });
//     }

//     const driver = rows[0];
//     //const isMatch = await bcrypt.compare(password, driver.password);

//     if (!isMatch) {
//       return res.status(401).json({ message: 'Invalid email or password' });
//     }

//     const token = jwt.sign(
//       { id: driver.id, email: driver.email, role: 'driver' }, // Include a role if applicable
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     // Filter out sensitive data like password before sending to client
//     const { password: _, ...userWithoutPassword } = driver;

//     res.status(200).json({ token, user: userWithoutPassword });
//   } catch (err) {
//     handleDbError(res, err, 'Login');
//   }
// });



app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM drivers WHERE email = ?', [email]);

    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const driver = rows[0];

    const isMatch = (password === driver.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: driver.id, email: driver.email, role: 'driver' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = driver;

    res.status(200).json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed', error: err.message || err });
  }
});



// Get driver by ID (Consolidated from /get/:uid and /:id)
app.get('/api/drivers/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'Driver ID is required' });
  }

  try {
    const [results] = await db.query('SELECT * FROM drivers WHERE id = ?', [id]); // Using await

    if (results.length === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Filter out sensitive data
    const { password, ...driverWithoutPassword } = results[0];
    res.status(200).json(driverWithoutPassword);
  } catch (err) {
    handleDbError(res, err, 'Fetching driver by ID');
  }
});

// Get driver status by email
app.get('/api/drivers/status/:email', async (req, res) => {
  const { email } = req.params;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const [rows] = await db.query('SELECT status FROM drivers WHERE email = ?', [email]); // Using await

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json({ status: rows[0].status });
  } catch (err) {
    handleDbError(res, err, 'Fetching driver status');
  }
});

// Get trip status by email (for active trips)
app.get('/api/trips/status/:email', async (req, res) => {
  const { email } = req.params;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const [trips] = await db.query( // Using await
      `SELECT * FROM trips WHERE driverEmail = ? AND (status = 'accept' OR status = 'WIP')`,
      [email]
    );

    const acceptedTrips = trips.filter(trip => trip.status === 'accept');
    const wipTrips = trips.filter(trip => trip.status === 'WIP');

    res.json({ acceptedTrips, wipTrips });
  } catch (err) {
    handleDbError(res, err, 'Fetching active trips for driver');
  }
});

// Update driver profile
app.put('/api/drivers/:id', async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body; // Ensure sensitive fields like 'password' are not updated directly here

  try {
    const [result] = await db.query('UPDATE drivers SET ? WHERE id = ?', [updatedData, id]); // Using await

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Driver not found or no changes made' });
    }

    res.json({ message: 'Driver updated successfully' });
  } catch (err) {
    handleDbError(res, err, 'Updating driver profile');
  }
});

// Get all trips (for admin dashboard, typically)
app.get('/api/trips', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM trips ORDER BY created_at DESC'); // Using await, order by creation
    res.status(200).json(rows);
  } catch (err) {
    handleDbError(res, err, 'Fetching all trips');
  }
});

// Get trip by ID
app.get('/api/trips/:id', async (req, res) => {
  const tripId = req.params.id;

  try {
    const [results] = await db.query('SELECT * FROM trips WHERE id = ?', [tripId]); // Using await

    if (results.length === 0) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    res.status(200).json(results[0]);
  } catch (err) {
    handleDbError(res, err, 'Fetching specific trip');
  }
});

// Complete trip endpoint
app.put('/api/trips/:id/complete', async (req, res) => {
  const tripId = req.params.id;
  const {
    startMeter,
    endMeter,
    luggage,
    pet,
    toll,
    hills,
    totalKm,
    finalKm,
    finalBill
  } = req.body;

  // Validate required fields
  if (!startMeter || !endMeter || !finalBill) {
    return res.status(400).json({ message: 'Required fields (startMeter, endMeter, finalBill) are missing' });
  }

  try {
    const [result] = await db.query( // Using await
      `UPDATE trips SET
        startMeter = ?,
        endMeter = ?,
        luggage = ?,
        pet = ?,
        toll = ?,
        hills = ?,
        totalKm = ?,
        finalKm = ?,
        finalBill = ?,
        status = 'completed',
        completed_at = NOW() -- Assuming a 'completed_at' timestamp column is added
      WHERE id = ?`,
      [
        startMeter,
        endMeter,
        luggage || 0,
        pet || 0,
        toll || 0,
        hills || 0,
        totalKm || 0,
        finalKm || 0,
        finalBill,
        tripId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Trip not found or not updated' });
    }

    res.json({
      message: 'Trip marked as completed successfully',
      tripId,
      finalBill
    });
  } catch (err) {
    handleDbError(res, err, 'Completing trip');
  }
});

// Create bill endpoint
app.post('/api/bills', async (req, res) => {
  const data = req.body;

  // Validate required fields
  if (!data.driverEmail || !data.customerName || !data.finalBill) {
    return res.status(400).json({ message: 'Required fields (driverEmail, customerName, finalBill) are missing' });
  }

  try {
    const [result] = await db.query( // Using await
      `INSERT INTO bills (
        driverEmail, customerName, phone,
        pickupLocation, dropLocation,
        pickupDate, pickupTime, tripType,
        startMeter, endMeter, totalKm, finalKm, kmPrice, totalKmPrice,
        luggageCharge, petCharge, tollCharge, hillsCharge, bettaCharge,
        stateCharge, totalEnteredCharges, finalBill, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.driverEmail,
        data.customerName,
        data.phone || null,
        data.pickupLocation || null,
        data.dropLocation || null,
        data.pickupDate || null,
        data.pickupTime || null,
        data.tripType || null,
        data.startMeter || 0,
        data.endMeter || 0,
        data.totalKm || 0,
        data.finalKm || 0,
        data.kmPrice || 0,
        data.totalKmPrice || 0,
        data.luggageCharge || 0,
        data.petCharge || 0,
        data.tollCharge || 0,
        data.hillsCharge || 0,
        data.bettaCharge || 0,
        data.stateCharge || 0,
        data.totalEnteredCharges || 0,
        data.finalBill,
        data.createdAt ? new Date(data.createdAt) : new Date() // Ensure createdAt is a Date object
      ]
    );

    res.status(201).json({
      message: 'Bill saved successfully',
      billId: result.insertId,
      tripId: data.tripId // Assuming tripId might be passed for linking
    });
  } catch (err) {
    handleDbError(res, err, 'Creating bill');
  }
});

// Get all bills for a specific driver
app.get('/api/bills/get/:driverEmail', async (req, res) => {
  const { driverEmail } = req.params;

  if (!driverEmail) {
    return res.status(400).json({ message: "driverEmail is required" });
  }

  const sql = `
    SELECT * FROM bills
    WHERE driverEmail = ?
    ORDER BY createdAt DESC
  `;

  try {
    const [results] = await db.query(sql, [driverEmail]); // Using await
    res.status(200).json(results);
  } catch (err) {
    handleDbError(res, err, 'Fetching driver bills');
  }
});

// Accept trip - Simplified to assign the trip to one driver
// app.put('/api/trips/:id/accept', async (req, res) => {
//   const tripId = req.params.id;
//   const { driverEmail } = req.body;

//   if (!driverEmail) {
//     return res.status(400).json({ message: 'driverEmail is required for accepting a trip' });
//   }

//   try {
//     // Set status to 'accept' and assign the driverEmail directly
//     const [result] = await db.query(
//       'UPDATE trips SET driverEmail = ?, status = ?, assignedAt = NOW() WHERE id = ?',
//       [driverEmail, 'accept', tripId]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: 'Trip not found or already assigned' });
//     }

//     res.status(200).json({ message: 'Trip accepted and assigned successfully' });
//   } catch (err) {
//     handleDbError(res, err, 'Accepting trip');
//   }
// });
app.put('/api/trips/:id/accept', async (req, res) => {
  const tripId = req.params.id;
  const { driverEmail } = req.body;

  if (!driverEmail) {
    return res.status(400).json({ message: 'Driver email is required' });
  }

  try {
    const [results] = await db.query(
      'SELECT acceptedDrivers FROM trips WHERE id = ?',
      [tripId]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    let currentAccepted = [];

    if (results[0].acceptedDrivers) {
      try {
        currentAccepted = JSON.parse(results[0].acceptedDrivers);
      } catch (parseErr) {
        console.error('Error parsing acceptedDrivers JSON:', parseErr);
        return res.status(500).json({ message: 'Invalid acceptedDrivers format in DB' });
      }
    }

    // Avoid duplicates
    if (!currentAccepted.includes(driverEmail)) {
      currentAccepted.push(driverEmail);
    }

    const updatedAcceptedDrivers = JSON.stringify(currentAccepted);

    await db.query(
      'UPDATE trips SET acceptedDrivers = ?, status = ? WHERE id = ?',
      [updatedAcceptedDrivers, 'accept', tripId]
    );

    res.status(200).json({ message: 'Trip accepted successfully' });

  } catch (err) {
    console.error('Trip acceptance error:', err);
    res.status(500).json({ message: 'Failed to accept trip', error: err.message || err });
  }
});

// Get accepted trips for a driver (based on driverEmail column)
app.get('/api/trips/accepted/:driverEmail', async (req, res) => {
  const { driverEmail } = req.params;

  if (!driverEmail) {
    return res.status(400).json({ message: 'driverEmail is required' });
  }

  try {
    // Assuming driverEmail column holds the assigned driver's email for 'accept' status
    const [results] = await db.query(
      'SELECT * FROM trips WHERE status = ? AND driverEmail = ? ORDER BY assignedAt DESC',
      ['accept', driverEmail]
    );
    res.status(200).json(results);
  } catch (err) {
    handleDbError(res, err, 'Fetching accepted trips');
  }
});

// Start trip (moves status from 'accept' to 'WIP')
app.put('/api/trips/:id/start', async (req, res) => {
  const tripId = req.params.id;

  try {
    const [result] = await db.query(
      'UPDATE trips SET status = ? WHERE id = ? AND status = "accept"', // Only allow starting if accepted
      ['WIP', tripId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Trip not found or not in "accept" status' });
    }

    res.status(200).json({ message: 'Trip started successfully' });
  } catch (err) {
    handleDbError(res, err, 'Starting trip');
  }
});

// Get WIP trips for a driver
app.get('/api/trips/wip/:driverEmail', async (req, res) => {
  const { driverEmail } = req.params;

  if (!driverEmail) {
    return res.status(400).json({ message: 'driverEmail is required' });
  }

  try {
    const [results] = await db.query(
      'SELECT * FROM trips WHERE status = ? AND driverEmail = ?', // Exact match for assigned driver
      ['WIP', driverEmail]
    );
    res.status(200).json(results);
  } catch (err) {
    handleDbError(res, err, 'Fetching WIP trips');
  }
});

// Update specific trip field (e.g., startMeter, endMeter)
app.put('/api/trips/update-field', async (req, res) => {
  const { tripId, field, value } = req.body;

  if (!tripId || !field) {
    return res.status(400).json({ message: "Missing tripId or field" });
  }

  // Whitelist allowed fields to prevent SQL injection
  const allowedFields = ['startMeter', 'endMeter', 'luggage', 'pet', 'toll', 'hills'];
  if (!allowedFields.includes(field)) {
    return res.status(400).json({ message: "Invalid field name provided" });
  }

  try {
    const [result] = await db.query(`UPDATE trips SET ${field} = ? WHERE id = ?`, [value, tripId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Trip not found or field not updated' });
    }
    res.status(200).json({ message: `Trip ${field} updated successfully` });
  } catch (err) {
    handleDbError(res, err, `Updating trip field: ${field}`);
  }
});

// Get a list of all drivers (email and name only for selection)
app.get('/api/drivers', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, email, name FROM drivers');
    res.status(200).json(rows);
  } catch (err) {
    handleDbError(res, err, 'Fetching drivers list');
  }
});

// Get all bills (for admin dashboard)
app.get('/api/all-bills', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bills ORDER BY createdAt DESC');
    res.status(200).json(rows);
  } catch (err) {
    handleDbError(res, err, 'Fetching all bills');
  }
});

// Get all driver details (for admin dashboard)
app.get('/api/all-drivers', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM drivers');
    // Filter out passwords before sending all driver details
    const driversWithoutPasswords = rows.map(driver => {
      const { password, ...driverData } = driver;
      return driverData;
    });
    res.status(200).json(driversWithoutPasswords);
  } catch (err) {
    handleDbError(res, err, 'Fetching all drivers details');
  }
});

// Assign driver to a trip (admin action)
app.put('/api/trips/assign-driver', async (req, res) => {
  const { tripId, driverEmail } = req.body;

  if (!tripId || !driverEmail) {
    return res.status(400).json({ message: 'tripId and driverEmail are required' });
  }

  // Ensure the trip is in a suitable status for assignment (e.g., 'pending' or 'new')
  // You might want to add a 'pending' status for unassigned trips
  const sql = `
    UPDATE trips
    SET driverEmail = ?, status = 'accept', assignedAt = NOW()
    WHERE id = ? AND status != 'completed' AND status != 'WIP'
  `;

  try {
    const [result] = await db.query(sql, [driverEmail, tripId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Trip not found or cannot be assigned (e.g., already completed/in progress)' });
    }
    res.status(200).json({ message: 'Driver assigned successfully' });
  } catch (err) {
    handleDbError(res, err, 'Assigning driver to trip');
  }
});

// Add a new trip (customer/admin action)
app.post("/api/trips/add-trips", async (req, res) => {
  const trip = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO trips (
        pickupLocation, dropLocation, tripType, car, pickupDate, pickupTime,
        days, kmPrice, km, betta, phone, state, customerName, customerRemark,
        adult, child, luggage, customerCurrentLocation, created_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      trip.pickupLocation || null,
      trip.dropLocation || null,
      trip.tripType || null,
      trip.car || null,
      trip.pickupDate || null,
      trip.pickupTime || null,
      trip.days || 0,
      trip.kmPrice || 0,
      trip.km || 0,
      trip.betta || 0,
      trip.phone || null,
      trip.state || null,
      trip.customerName || null,
      trip.customerRemark || null,
      trip.adult || 0,
      trip.child || 0,
      trip.luggage || 0,
      trip.customerCurrentLocation || null,
      new Date(), // Set created_at to current timestamp
      'pending' // Default status for new trips
    ]);

    res.status(201).json({ message: "Trip stored successfully", tripId: result.insertId });
  } catch (error) {
    handleDbError(res, error, "Inserting new trip");
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
