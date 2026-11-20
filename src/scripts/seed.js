// Run AFTER the client is running (it creates accounts through BetterAuth so passwords are hashed correctly).
require('dotenv').config();
const { c, connect } = require('../config/db');
const CLIENT = process.env.CLIENT_URL || 'http://localhost:3000';
const USERS = [
  { name: 'Sagar Ahmed', email: 'admin@test.com', password: 'Admin@123', role: 'admin' },
  { name: 'Joy Ahmed', email: 'tech@test.com', password: 'Tech@123', role: 'technician', area: 'Mirpur, Dhaka', bio: '8 years fixing smartphones and laptops. Genuine parts, 30-day warranty.' },
  { name: 'Shanto Hossain', email: 'tech2@test.com', password: 'Tech2@123', role: 'technician', area: 'Dhanmondi, Dhaka', bio: 'Certified AC, refrigerator and washing machine technician.' },
  { name: 'Raju Islam', email: 'raju@test.com', password: 'Customer@123', role: 'customer', area: 'Uttara, Dhaka' },
];
const img = (t) => `https://placehold.co/800x500/0f3d47/f5b83d?text=${encodeURIComponent(t)}`;
const S = (tech, title, category, price, dur, mode, area, desc) => ({ title, category, basePrice: price, estimatedDuration: dur, serviceMode: mode, serviceArea: area,
  description: desc, image: img(title), technicianName: tech.name, technicianEmail: tech.email, approvalStatus: 'approved', isAvailable: true, createdAt: new Date() });

(async () => {
  await connect();
  for (const u of USERS) {
    if (!(await c.users.findOne({ email: u.email }))) {
      const r = await fetch(`${CLIENT}/api/auth/sign-up/email`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: CLIENT },
        body: JSON.stringify({ name: u.name, email: u.email, password: u.password }) });
      if (!r.ok) throw new Error(`Sign-up failed for ${u.email}: ${await r.text()} (is the client running?)`);
    }
    await c.users.updateOne({ email: u.email }, { $set: { role: u.role, area: u.area || '', bio: u.bio || '', phone: '01700000000' } });
  }
  const [t1, t2] = USERS.slice(1, 3);
  await c.services.deleteMany({ technicianEmail: { $in: [t1.email, t2.email] } });
  const services = [
    S(t1, 'iPhone Screen Replacement', 'Smartphone', 85, '2-3 hours', 'Shop Drop-off', 'Mirpur, Dhaka', 'Original-quality display replacement with 30-day warranty.'),
    S(t1, 'Android Battery Replacement', 'Smartphone', 35, '1 hour', 'Shop Drop-off', 'Mirpur, Dhaka', 'New battery fitted and health-tested while you wait.'),
    S(t1, 'Laptop Servicing & Cleaning', 'Laptop & PC', 40, '1 day', 'Home Visit', 'Mirpur, Dhaka', 'Deep clean, thermal paste, fan check and OS tune-up.'),
    S(t1, 'Laptop Screen Repair', 'Laptop & PC', 95, '1-2 days', 'Shop Drop-off', 'Pallabi, Dhaka', 'Cracked or flickering laptop screens replaced.'),
    S(t1, 'Desktop PC Troubleshooting', 'Laptop & PC', 30, '2 hours', 'Home Visit', 'Mirpur, Dhaka', 'Boot failures, slowdowns and hardware diagnosis at your place.'),
    S(t1, 'Smart TV Panel Diagnosis', 'TV', 45, '2 hours', 'Home Visit', 'Mirpur, Dhaka', 'Backlight, no-picture and HDMI faults diagnosed on site.'),
    S(t2, 'AC Servicing & Gas Refill', 'AC', 55, '2-3 hours', 'Home Visit', 'Dhanmondi, Dhaka', 'Filter wash, coil clean and gas top-up for split and window ACs.'),
    S(t2, 'AC Installation', 'AC', 70, '3 hours', 'Home Visit', 'Dhanmondi, Dhaka', 'Safe wall mounting, piping and test run.'),
    S(t2, 'Refrigerator Cooling Repair', 'Refrigerator', 60, '3 hours', 'Home Visit', 'Dhanmondi, Dhaka', 'Compressor, thermostat and leakage checks.'),
    S(t2, 'Washing Machine Repair', 'Washing Machine', 50, '2 hours', 'Home Visit', 'Dhanmondi, Dhaka', 'Drum, drain pump and control board repairs.'),
    S(t2, 'House Electrical Wiring Check', 'Electrical', 40, '2 hours', 'Home Visit', 'Dhanmondi, Dhaka', 'Short-circuit tracing, switch and socket replacement.'),
    S(t2, 'LED TV Repair', 'TV', 65, '1 day', 'Shop Drop-off', 'Dhanmondi, Dhaka', 'Power board and display driver repair.'),
  ];
  const ins = await c.services.insertMany(services);
  const ids = Object.values(ins.insertedIds);
  await c.bookings.deleteMany({ customerEmail: 'raju@test.com' });
  const B = (i, status, extra = {}) => { const s = services[i]; return { serviceId: String(ids[i]), serviceTitle: s.title, serviceImage: s.image, category: s.category,
    basePrice: s.basePrice, technicianName: s.technicianName, technicianEmail: s.technicianEmail, customerName: 'Raju Islam', customerEmail: 'raju@test.com',
    customerPhone: '01711111111', address: 'House 12, Road 5, Uttara, Dhaka', preferredDate: new Date(Date.now() + 2 * 864e5),
    problemDescription: 'The device stopped working properly and needs a professional check.', status, finalAmount: s.basePrice, paymentStatus: 'unpaid', createdAt: new Date(), ...extra }; };
  await c.bookings.insertMany([B(0, 'requested'), B(6, 'accepted'), B(9, 'in-progress'), B(2, 'completed', { finalAmount: 45 }), B(8, 'rejected'), B(1, 'cancelled')]);
  console.log('Seeded. Logins: admin@test.com / Admin@123 | tech@test.com / Tech@123 | raju@test.com / Customer@123');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
