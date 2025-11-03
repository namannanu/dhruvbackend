const path = require('path');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables the same way the server does
const envPath = path.resolve(__dirname, '..', '.env');
const configEnvPath = path.resolve(__dirname, '..', 'src', 'config', 'config.env');
dotenv.config({ path: envPath });
dotenv.config({ path: configEnvPath });

const connectDB = require('../src/config/db');
const User = require('../src/modules/users/user.model');
const WorkerProfile = require('../src/modules/workers/workerProfile.model');
const EmployerProfile = require('../src/modules/employers/employerProfile.model');
const Business = require('../src/modules/businesses/business.model');

const ensureJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Missing JWT_SECRET. Please set it in .env or config.env.');
  }
};

const signToken = (userId) => {
  ensureJwtSecret();
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const upsertWorker = async ({ email, password, firstName, lastName }) => {
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      password,
      userType: 'worker',
      firstName,
      lastName
    });
  } else {
    user.userType = 'worker';
    user.firstName = firstName;
    user.lastName = lastName;
    user.password = password; // triggers pre-save hash
    user.premium = user.premium || false;
    await user.save();
  }

  await WorkerProfile.findOneAndUpdate(
    { user: user._id },
    {
      user: user._id,
      bio: 'Demo worker profile',
      skills: ['reliable', 'punctual'],
      experience: '2 years of experience in demo tasks.'
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return user;
};

const upsertEmployer = async ({ email, password, firstName, lastName, companyName }) => {
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      password,
      userType: 'employer',
      firstName,
      lastName
    });
  } else {
    user.userType = 'employer';
    user.firstName = firstName;
    user.lastName = lastName;
    user.password = password;
    await user.save();
  }

  const profile = await EmployerProfile.findOneAndUpdate(
    { user: user._id },
    {
      user: user._id,
      companyName,
      description: 'Demo employer profile',
      phone: '+1234567890'
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (!profile.defaultBusiness) {
    const business = await Business.create({
      owner: user._id,
      name: `${companyName} Main Location`,
      description: 'Auto created demo business',
      phone: '+1234567890',
      email,
      isActive: true
    });

    profile.defaultBusiness = business._id;
    await profile.save();

    user.selectedBusiness = business._id;
    await user.save();
  }

  return user;
};

const seed = async () => {
  await connectDB();

  console.log('Seeding demo users...');

  const worker = await upsertWorker({
    email: 'worker.demo@example.com',
    password: 'password123',
    firstName: 'Demo',
    lastName: 'Worker'
  });

  const employer = await upsertEmployer({
    email: 'employer.demo@example.com',
    password: 'password123',
    firstName: 'Demo',
    lastName: 'Employer',
    companyName: 'Demo Employer Co'
  });

  const workerToken = signToken(worker._id);
  const employerToken = signToken(employer._id);

  console.log('\n✅ Demo users ready:');
  console.log(`   Worker:   ${worker.email}`);
  console.log(`   Employer: ${employer.email}`);

  console.log('\n🔐 Ready-to-use tokens:');
  console.log(`WORKER_TOKEN="${workerToken}"`);
  console.log(`EMPLOYER_TOKEN="${employerToken}"`);

  console.log('\nUse these credentials to log in via /api/auth/login or copy the tokens above for Authorization headers.');

  process.exit(0);
};

seed().catch((err) => {
  console.error('Failed to seed demo users:', err);
  process.exit(1);
});
