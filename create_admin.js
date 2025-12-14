const bcrypt = require('bcryptjs');

async function createAdmin() {
  const password = "Admin@123456";
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(`
-- Create admin user
INSERT INTO users (username, email, password_hash, is_active, email_verified)
VALUES ('admin', 'admin@momtazchem.com', '${hashedPassword}', true, true)
ON CONFLICT (email) DO NOTHING;
`);
  console.log(`Default password: ${password}`);
}

createAdmin().catch(console.error);
