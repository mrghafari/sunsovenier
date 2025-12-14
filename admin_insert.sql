INSERT INTO users (username, email, password_hash, is_active, email_verified)
VALUES ('admin', 'admin@momtazchem.com', '$2b$10$EPpbYyMuEJuAS9h0zNkFJeesJBnmTSBROFch8RGLgJ8EWRcQdHPsi', true, true)
ON CONFLICT (email) DO NOTHING;
